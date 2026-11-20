import argparse
import csv
import hashlib
import json
from pathlib import Path

from evaluate_search import metrics
from prepare_evaluation import review_pairs


def score(ids, judgments, cutoff):
    ranked = ids[:cutoff]
    if len(set(ranked)) != len(ranked) or any(key not in judgments for key in ranked):
        raise ValueError("Duplicate or unjudged retrieved ID")
    known_hits = sum(judgments[key] is not None and judgments[key] > 0 for key in ranked)
    full_hits = sum(judgments[key] == 3 for key in ranked)
    unknown = sum(judgments[key] is None for key in ranked)
    complete = all(grade is not None for grade in judgments.values())
    return {"precisionLower": known_hits / cutoff,
            "precisionUpper": (known_hits + unknown) / cutoff,
            "fullMatchPrecisionLower": full_hits / cutoff,
            "fullMatchPrecisionUpper": (full_hits + unknown) / cutoff,
            "judgedAtK": len(ranked) - unknown, "returnedAtK": len(ranked),
            "pooledNdcg": metrics(ranked, judgments, cutoff)["ndcg"]
            if complete and any(judgments.values()) else None}


def evaluate(workspace, assessments):
    manifest = json.loads((workspace / "manifest.json").read_text(encoding="utf-8"))
    catalog = (workspace / "catalog.json").read_bytes()
    if hashlib.sha256(catalog).hexdigest() != manifest["catalogSha256"]:
        raise ValueError("Catalog checksum mismatch")
    if assessments["provenance"].get("humanReviewed") is not False:
        raise ValueError("This evaluator requires explicitly non-human labels")
    if assessments["provenance"].get("catalogSha256") != manifest["catalogSha256"]:
        raise ValueError("Assessment snapshot mismatch")
    if assessments["provenance"].get("worksheetSha256") != hashlib.sha256((workspace / "human-review.csv").read_bytes()).hexdigest():
        raise ValueError("Assessment worksheet mismatch")
    with (workspace / "human-review.csv").open(encoding="utf-8-sig", newline="") as source:
        worksheet = list(csv.DictReader(source))
    expected = review_pairs(manifest)
    facts = {(row["query_id"], row["product_id"]): row for row in worksheet}
    if len(worksheet) != len(expected) or set(facts) != expected:
        raise ValueError("Worksheet coverage mismatch")
    judgments, seen = {}, set()
    for row in assessments["assessments"]:
        key = (row["query_id"], row["product_id"])
        grade = row["ai_grade"]
        if key not in expected or key in seen or (grade is not None and (type(grade) is not int or not 0 <= grade <= 3)):
            raise ValueError("Invalid, duplicate or unknown assessment")
        if not isinstance(row.get("ai_reason"), str) or not row["ai_reason"].strip():
            raise ValueError("Assessment needs evidence/reason")
        if any(row.get(field) != facts[key][field] for field in ("query", "name", "category", "audience", "price", "description")):
            raise ValueError("Assessment facts changed")
        seen.add(key)
        judgments.setdefault(key[0], {})[key[1]] = grade
    if seen != expected:
        raise ValueError("Incomplete assessments")
    frozen = json.loads((workspace / "retrieval-runs.json").read_text(encoding="utf-8"))
    if (frozen.get("catalogSha256") != manifest["catalogSha256"]
            or frozen.get("queries") != manifest["humanQueries"]
            or frozen.get("cutoff") != manifest["poolDepth"]):
        raise ValueError("Frozen snapshot/query/depth mismatch")
    runs = frozen["runs"]
    if set(runs) != set(manifest["humanQueries"]):
        raise ValueError("Retrieval query mismatch")
    for query_id, modes in runs.items():
        if set(modes) != {"keyword", "semantic", "hybrid"}:
            raise ValueError("Retrieval modes mismatch")
        union = set()
        for ids in modes.values():
            if len(ids) > manifest["poolDepth"] or len(set(ids)) != len(ids):
                raise ValueError("Invalid frozen ranking")
            union.update(ids)
        if union != set(judgments[query_id]):
            raise ValueError("Frozen rankings do not match judged pool")
    details = []
    for cutoff in (5, 10):
        if cutoff > manifest["poolDepth"]:
            continue
        for query_id, modes in runs.items():
            for mode, ids in modes.items():
                details.append({"queryId": query_id, "mode": mode, "cutoff": cutoff,
                                **score(ids, judgments[query_id], cutoff)})
    summary = []
    for cutoff in (5, 10):
        for mode in ("keyword", "semantic", "hybrid"):
            rows = [row for row in details if row["cutoff"] == cutoff and row["mode"] == mode]
            if not rows:
                continue
            ndcg = [row["pooledNdcg"] for row in rows if row["pooledNdcg"] is not None]
            summary.append({"mode": mode, "cutoff": cutoff, "queries": len(rows),
                            "precisionLower": sum(row["precisionLower"] for row in rows) / len(rows),
                            "precisionUpper": sum(row["precisionUpper"] for row in rows) / len(rows),
                            "fullMatchPrecisionLower": sum(row["fullMatchPrecisionLower"] for row in rows) / len(rows),
                            "fullMatchPrecisionUpper": sum(row["fullMatchPrecisionUpper"] for row in rows) / len(rows),
                            "pooledNdcgCompleteQueries": sum(ndcg) / len(ndcg) if ndcg else None,
                            "ndcgQueries": len(ndcg)})
    return {"provenance": assessments["provenance"], "assessedPairs": len(seen),
            "unknownPairs": sum(grade is None for values in judgments.values() for grade in values.values()),
            "recall": None, "summary": summary, "perQuery": details,
            "limitations": "Frozen development pool; AI labels, not human quality. Precision bounds leave unknowns unresolved; NDCG only for fully labeled pools with positive gain. No live latency, full-catalog recall, held-out or recommendation-quality claim.",
            "inputSha256": {name: hashlib.sha256((workspace / name).read_bytes()).hexdigest()
                            for name in ("catalog.json", "manifest.json", "human-review.csv", "retrieval-runs.json")}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate frozen pooled rankings using explicit AI labels")
    parser.add_argument("workspace", type=Path)
    parser.add_argument("assessments", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    report = evaluate(args.workspace, json.loads(args.assessments.read_text(encoding="utf-8")))
    with args.output.open("x", encoding="utf-8") as target:
        json.dump(report, target, indent=2, ensure_ascii=False, allow_nan=False)
    print(json.dumps(report["summary"], indent=2))
