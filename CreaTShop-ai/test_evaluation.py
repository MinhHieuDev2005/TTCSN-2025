import csv
import hashlib
import json
import tempfile
import unittest
import io
from unittest.mock import patch
from pathlib import Path

from evaluate_search import metrics
from prepare_evaluation import RULES, csv_safe, finalize_review, prepare_pool, proposed_metadata, silver_queries
from review_ui import build

class EvaluationChecks(unittest.TestCase):
    def test_pooled_workflow_and_unknown_labels(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            products = [{"id": index, "name": f"Shoe {index}", "categoryId": 1, "price": 100} for index in (1, 2, 3)]
            catalog = json.dumps({"products": products, "categories": [{"id": 1, "name": "Shoes", "type": "MEN"}]}).encode()
            (root / "catalog.json").write_bytes(catalog)
            (root / "manifest.json").write_text(json.dumps({"catalogSha256": hashlib.sha256(catalog).hexdigest(), "productIds": ["1", "2", "3"], "humanQueries": {"h01": "shoes"}}))
            def response(mode, items, fallback=None):
                return io.BytesIO(json.dumps({"data": {"mode": mode, "fallbackReason": fallback, "items": items}}).encode())
            output = root / "pool"
            with patch("urllib.request.urlopen", side_effect=[response("keyword", products[:1]), response("semantic", products[1:2]), response("hybrid", products[:2])]):
                prepare_pool(root, output, "http://127.0.0.1", 2)
            with (output / "human-review.csv").open(encoding="utf-8-sig", newline="") as source:
                reader = csv.DictReader(source)
                fields, rows = reader.fieldnames, list(reader)
            self.assertEqual({row["product_id"] for row in rows}, {"1", "2"})
            self.assertTrue(all(row["grade"] == "" for row in rows))
            build(output, output / "review.html")
            self.assertNotIn("retrieval-runs", (output / "review.html").read_text(encoding="utf-8"))
            with self.assertRaises(ValueError):
                finalize_review(output, "reviewer")
            for row in rows:
                row["grade"] = "3" if row["product_id"] == "1" else "0"
            with (output / "human-review.csv").open("w", encoding="utf-8-sig", newline="") as target:
                writer = csv.DictWriter(target, fieldnames=fields)
                writer.writeheader()
                writer.writerows(rows)
            result = finalize_review(output, "reviewer")
            self.assertFalse(result["queries"][0]["exhaustive"])
            self.assertIsNone(metrics([1, 2], result["queries"][0]["judgments"], 2)["recall"])
            with self.assertRaises(ValueError):
                metrics([3], result["queries"][0]["judgments"], 1)
            failed = root / "fallback"
            with patch("urllib.request.urlopen", return_value=response("keyword", [], "MODEL_UNAVAILABLE")):
                with self.assertRaises(ValueError):
                    prepare_pool(root, failed, "http://127.0.0.1", 2)
            self.assertFalse(failed.exists())
            with patch("urllib.request.urlopen", return_value=response("keyword", [dict(products[0], price=999)])):
                with self.assertRaises(ValueError):
                    prepare_pool(root, failed, "http://127.0.0.1", 2)
            self.assertFalse(failed.exists())

    def test_metadata_only_uses_known_facts(self):
        result = proposed_metadata({"name": "Example shoes"}, {"name": "Sandal", "type": "WOMEN"})
        self.assertIn("Example shoes", result["description"])
        self.assertIn("Sandal", result["description"])
        self.assertIn("n\u1eef", result["description"])
        self.assertEqual([result[field] for field in ("material", "style", "occasion")], ["", "", ""])
        self.assertEqual(proposed_metadata({"name": "x", "description": "Verified", "material": "Known"}, {"name": "x", "type": "MEN"})["description"], "Verified")

    def test_review_requires_complete_explicit_judgments(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            (folder / "catalog.json").write_bytes(b"snapshot")
            (folder / "manifest.json").write_text(json.dumps({"productIds": ["1", "2"], "humanQueries": {"h01": "query"}, "catalogSha256": hashlib.sha256(b"snapshot").hexdigest()}))
            def write(rows):
                with (folder / "human-review.csv").open("w", newline="", encoding="utf-8") as target:
                    writer = csv.DictWriter(target, fieldnames=["query_id", "query", "product_id", "grade"])
                    writer.writeheader()
                    writer.writerows({"query_id": "h01", "query": "query", "product_id": product_id, "grade": grade} for product_id, grade in rows)
            for rows in [[("1", "")], [("1", "4")], [("1", "1")], [("1", "1"), ("1", "0")], [("1", "0"), ("2", "0")]]:
                write(rows)
                with self.assertRaises(ValueError):
                    finalize_review(folder, "reviewer")
            write([("1", "3"), ("2", "0")])
            result = finalize_review(folder, "reviewer")
            self.assertEqual(result["provenance"]["labelSource"], "human-reviewed")
            self.assertEqual(result["queries"][0]["judgments"], {"1": 3, "2": 0})
            (folder / "catalog.json").write_bytes(b"changed")
            with self.assertRaises(ValueError):
                finalize_review(folder, "reviewer")

    def test_csv_formula_protection(self):
        for value in ("=SUM(1,2)", " +cmd", "-cmd", "@cmd", "\tx"):
            self.assertTrue(csv_safe({"name": value})["name"].startswith("'"))
        self.assertEqual(csv_safe({"name": "Normal", "price": 100}), {"name": "Normal", "price": 100})

    def test_silver_labels_use_category_and_price_only(self):
        products, categories = [], {}
        for query_id, query, types, category_name, bounds in RULES:
            for audience in types:
                product_id = len(products) + 1
                categories[product_id] = {"name": category_name or "other", "type": audience}
                products.append({"id": product_id, "categoryId": product_id, "price": 350000})
        result = silver_queries(products, categories)
        self.assertEqual(len(result), 20)
        for row in result:
            self.assertTrue(row["exhaustive"])
            self.assertEqual(len(row["judgments"]), len(products))
            for product_id, grade in row["judgments"].items():
                if grade:
                    self.assertIn(categories[int(product_id)]["type"], row["rule"]["audiences"])

    def test_short_result_precision_and_exhaustive_recall(self):
        result = metrics([1], {"1": 1, "2": 1}, 5, True)
        self.assertEqual(result["precision"], 0.2)
        self.assertEqual(result["recall"], 0.5)
        self.assertIsNone(metrics([1], {"1": 1}, 5)["recall"])
        with self.assertRaises(ValueError):
            metrics([1, 1], {"1": 1}, 5, True)

if __name__ == "__main__":
    unittest.main()
