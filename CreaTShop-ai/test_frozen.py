import unittest
import csv
import hashlib
import json
import tempfile
from pathlib import Path

from evaluate_frozen import evaluate, score


class FrozenChecks(unittest.TestCase):
    def test_current_catalog_artifacts_are_reproducible_and_not_human(self):
        root = Path(__file__).resolve().parents[1] / "docs/experiments/search-ai-current-20261120"
        checksums = json.loads((root / "checksums.json").read_text(encoding="utf-8"))
        for name, checksum in checksums.items():
            self.assertEqual(hashlib.sha256((root / name).read_bytes()).hexdigest(), checksum)
        labels = json.loads((root / "ai-assessments.json").read_text(encoding="utf-8"))
        self.assertEqual(labels["provenance"]["humanReviewCount"], 0)
        self.assertTrue(all(row["human_confirmed"] is False for row in labels["assessments"]))
        self.assertEqual(evaluate(root, labels), json.loads((root / "metrics.json").read_text(encoding="utf-8")))

    def test_full_match_does_not_count_partial_or_mostly_matching(self):
        result = score(["1", "2", "3", "4"], {"1": 1, "2": 2, "3": 3, "4": None}, 5)
        self.assertEqual((result["precisionLower"], result["precisionUpper"]), (0.6, 0.8))
        self.assertEqual((result["fullMatchPrecisionLower"], result["fullMatchPrecisionUpper"]), (0.2, 0.4))
        self.assertIsNone(result["pooledNdcg"])

    def test_unknowns_and_pool_scope(self):
        result = score(["1", "2"], {"1": 3, "2": None, "3": 0}, 5)
        self.assertEqual((result["precisionLower"], result["precisionUpper"]), (0.2, 0.4))
        self.assertIsNone(result["pooledNdcg"])
        self.assertIsNone(score(["1"], {"1": 0}, 5)["pooledNdcg"])
        self.assertEqual(score(["1", "2"], {"1": 3, "2": 0}, 5)["pooledNdcg"], 1)
        with self.assertRaises(ValueError):
            score(["1", "1"], {"1": 3}, 5)
        with self.assertRaises(ValueError):
            score(["2"], {"1": 3}, 5)

    def test_frozen_pipeline_and_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            catalog = b'{"products":[]}'
            checksum = hashlib.sha256(catalog).hexdigest()
            manifest = {"catalogSha256": checksum, "humanQueries": {"h01": "shoes"},
                        "productIds": ["1", "2"], "queryProductIds": {"h01": ["1", "2"]}, "poolDepth": 10}
            (root / "catalog.json").write_bytes(catalog)
            (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            rows = [{"query_id": "h01", "product_id": product, "query": "shoes", "name": "Shoe",
                     "category": "Shoes", "audience": "MEN", "price": "100", "description": ""}
                    for product in ("1", "2")]
            with (root / "human-review.csv").open("w", encoding="utf-8-sig", newline="") as target:
                writer = csv.DictWriter(target, fieldnames=list(rows[0]))
                writer.writeheader()
                writer.writerows(rows)
            frozen = {"catalogSha256": checksum, "queries": manifest["humanQueries"], "cutoff": 10,
                      "runs": {"h01": {mode: ["1", "2"] for mode in ("keyword", "semantic", "hybrid")}}}
            (root / "retrieval-runs.json").write_text(json.dumps(frozen), encoding="utf-8")
            labels = {"provenance": {"humanReviewed": False, "catalogSha256": checksum,
                                     "worksheetSha256": hashlib.sha256((root / "human-review.csv").read_bytes()).hexdigest()},
                      "assessments": [{**row, "ai_grade": 3 if index == 0 else None, "ai_reason": "Evidence"}
                                      for index, row in enumerate(rows)]}
            report = evaluate(root, labels)
            self.assertEqual(report["unknownPairs"], 1)
            self.assertEqual(len(report["summary"]), 6)
            self.assertTrue(all(row["ndcgQueries"] == 0 for row in report["summary"]))
            labels["assessments"][1]["ai_grade"] = 0
            self.assertTrue(all(row["ndcgQueries"] == 1 for row in evaluate(root, labels)["summary"]))
            labels["assessments"][0]["name"] = "Changed"
            with self.assertRaises(ValueError):
                evaluate(root, labels)
            labels["assessments"][0]["name"] = "Shoe"
            frozen["catalogSha256"] = "wrong"
            (root / "retrieval-runs.json").write_text(json.dumps(frozen), encoding="utf-8")
            with self.assertRaises(ValueError):
                evaluate(root, labels)
