import argparse
import json
import math
import time
import urllib.parse
import urllib.request


def metrics(ids, judgments, cutoff, exhaustive=False):
    if type(cutoff) is not int or cutoff < 1:
        raise ValueError("Cutoff must be a positive integer")
    if not judgments or any(type(grade) is not int or not 0 <= grade <= 3 for grade in judgments.values()):
        raise ValueError("Judgments must be non-empty integer grades 0..3")
    ranked = ids[:cutoff]
    if len({str(product_id) for product_id in ranked}) != len(ranked):
        raise ValueError("Duplicate ranked product IDs would inflate evaluation metrics")
    unknown = [str(product_id) for product_id in ranked if str(product_id) not in judgments]
    if unknown:
        raise ValueError(f"Unjudged retrieved products: {', '.join(unknown)}; obtain labels instead of assuming zero")
    relevant = {key for key, grade in judgments.items() if grade > 0}
    hits = sum(str(product_id) in relevant for product_id in ranked)
    dcg = sum((2 ** judgments.get(str(product_id), 0) - 1) / math.log2(index + 2)
              for index, product_id in enumerate(ranked))
    ideal = sum((2 ** grade - 1) / math.log2(index + 2)
                for index, grade in enumerate(sorted(judgments.values(), reverse=True)[:cutoff]))
    return {"precision": hits / cutoff, "recall": hits / len(relevant) if exhaustive and relevant else None,
            "ndcg": dcg / ideal if ideal else 0.0}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", nargs="?")
    parser.add_argument("--base", default="http://127.0.0.1:8080/api/v1")
    parser.add_argument("--cutoff", type=int, default=10)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--allow-silver", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        result = metrics([1, 2], {"1": 2, "2": 1}, 2, True)
        assert result == {"precision": 1.0, "recall": 1.0, "ndcg": 1.0}
        assert metrics([], {"1": 2}, 10)["recall"] is None
        assert metrics([2, 1], {"1": 2, "2": 1}, 2)["ndcg"] < 1
        print("PASS: ranking metric checks")
        return
    if not args.dataset or not 1 <= args.cutoff <= 60:
        parser.error("dataset and cutoff between 1 and 60 are required")
    with open(args.dataset, encoding="utf-8") as source:
        dataset = json.load(source)
    provenance = {"labelSource": "legacy-unspecified"}
    if isinstance(dataset, dict):
        provenance = dataset.get("provenance", {})
        dataset = dataset.get("queries")
        if not isinstance(provenance, dict):
            parser.error("provenance must be an object")
        if (provenance.get("labelSource") != "human-reviewed" or provenance.get("humanReviewed") is not True) and not args.allow_silver:
            parser.error("non-human labels require --allow-silver; results are not human relevance metrics")
    elif not args.allow_silver:
        parser.error("legacy datasets lack reviewer provenance; use --allow-silver or a human-reviewed dataset")
    if not isinstance(dataset, list) or not dataset:
        parser.error("dataset must be a non-empty list")
    for row in dataset:
        if (not isinstance(row, dict) or not isinstance(row.get("query"), str) or not row["query"].strip()
                or not isinstance(row.get("judgments"), dict) or not row["judgments"]
                or any(not key.isdigit() or int(key) < 1 or type(grade) is not int or not 0 <= grade <= 3
                       for key, grade in row["judgments"].items())):
            parser.error("each row needs query and judgments {productId: integer grade 0..3}")
    report = {"provenance": provenance}
    for mode in ("keyword", "semantic", "hybrid"):
        results, latency, details = [], [], []
        for row in dataset:
            params = urllib.parse.urlencode({"q": row["query"], "mode": mode, "size": args.cutoff})
            started = time.perf_counter()
            with urllib.request.urlopen(args.base.rstrip("/") + "/products/search?" + params, timeout=20) as response:
                data = json.load(response)["data"]
            latency.append((time.perf_counter() - started) * 1000)
            if data["mode"] != mode or data.get("fallbackReason"):
                raise RuntimeError(f"Cannot evaluate {mode}: actual mode={data['mode']}, fallback={data.get('fallbackReason')}")
            ids = [item["id"] for item in data["items"]]
            try:
                result = metrics(ids, row["judgments"], args.cutoff, row.get("exhaustive") is True)
            except ValueError as error:
                raise ValueError(f"{mode}, query={row['query']!r}: {error}") from error
            results.append(result)
            details.append({"query": row["query"], "ids": ids, "metrics": result,
                            "ndcg_scope": "catalog" if row.get("exhaustive") is True else "judged-pool"})
        summary = {}
        for key in ("precision", "recall", "ndcg"):
            values = [result[key] for result in results if result[key] is not None]
            summary[key] = sum(values) / len(values) if values else None
        summary.update({"queries": len(results), "cutoff": args.cutoff,
                        "latency_p50_ms": sorted(latency)[math.ceil(len(latency) * .5) - 1],
                        "latency_p95_ms": sorted(latency)[math.ceil(len(latency) * .95) - 1]})
        summary["per_query"] = details
        report[mode] = summary
    print(json.dumps(report, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
