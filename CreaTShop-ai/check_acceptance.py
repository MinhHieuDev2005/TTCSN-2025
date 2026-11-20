import argparse
import concurrent.futures
import json
import math
import platform
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


BASE = "http://127.0.0.1:18080/api/v1"
QUERIES = ["giay nu di lam", "sandal nam", "giay cho be tap di"]


def request(path, method="GET", body=None, headers=None):
    started = time.perf_counter()
    query = urllib.request.Request(BASE + path, method=method, data=body, headers=headers or {})
    try:
        with urllib.request.urlopen(query, timeout=15) as response:
            status, payload = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, payload = error.code, error.read()
    except (OSError, TimeoutError) as error:
        return {"status": None, "latencyMs": (time.perf_counter() - started) * 1000, "error": type(error).__name__}, None
    result = {"status": status, "latencyMs": (time.perf_counter() - started) * 1000}
    try:
        return result, json.loads(payload) if payload else None
    except (ValueError, UnicodeError):
        return result | {"error": "non-json-response"}, None


def search(mode, query):
    result, payload = request("/products/search?" + urllib.parse.urlencode({"q": query, "mode": mode, "size": 5}))
    data = payload.get("data") if isinstance(payload, dict) else None
    result.update({"requestedMode": mode, "query": query})
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        return result | {"valid": False}
    ids = [item.get("id") for item in data["items"] if isinstance(item, dict)]
    actual, fallback = data.get("mode"), data.get("fallbackReason")
    consistent = (actual == mode and not fallback) or (mode != "keyword" and actual == "keyword" and isinstance(fallback, str) and bool(fallback))
    result.update({"actualMode": actual, "fallbackReason": fallback, "ids": ids,
                   "valid": result["status"] == 200 and "error" not in result and len(ids) == len(data["items"]) and len(ids) <= 5
                   and all(type(product_id) is int and product_id > 0 for product_id in ids)
                   and len(set(ids)) == len(ids) and consistent})
    return result


def percentile(values, fraction):
    return sorted(values)[math.ceil(len(values) * fraction) - 1] if values else None


def run(output, samples):
    if output.exists():
        raise FileExistsError("Refusing to overwrite an acceptance report")
    warmup = [search(mode, QUERIES[0]) for mode in ("keyword", "semantic", "hybrid")]
    if any(not row["valid"] or row.get("fallbackReason") for row in warmup):
        raise RuntimeError("Private acceptance API must be ready with real AI before measurement")
    batches = []
    for concurrency in (1, 2, 4):
        for mode in ("keyword", "semantic", "hybrid"):
            started = time.perf_counter()
            with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
                rows = list(executor.map(lambda index: search(mode, QUERIES[index % len(QUERIES)]), range(samples)))
            elapsed = time.perf_counter() - started
            ai_rows = [row for row in rows if row["valid"] and row.get("actualMode") == mode and not row.get("fallbackReason")]
            batches.append({"concurrency": concurrency, "mode": mode, "requests": samples,
                           "elapsedSeconds": elapsed, "requestsPerSecond": samples / elapsed,
                           "p50Ms": percentile([row["latencyMs"] for row in rows], .5),
                           "p95Ms": percentile([row["latencyMs"] for row in rows], .95),
                           "validResponses": sum(row["valid"] for row in rows),
                           "requestedModeResponses": len(ai_rows),
                           "requestedModeP95Ms": percentile([row["latencyMs"] for row in ai_rows], .95),
                           "fallbackCounts": dict(Counter(row["fallbackReason"] for row in rows if row.get("fallbackReason"))),
                           "observations": rows})
    cases = [
        ("page-zero", "/products/search?page=0", "GET", None, {}, (400,)),
        ("size-too-large", "/products/search?size=61", "GET", None, {}, (400,)),
        ("invalid-mode", "/products/search?mode=invalid", "GET", None, {}, (400,)),
        ("oversized-query", "/products/search?q=" + "a" * 501, "GET", None, {}, (400,)),
        ("negative-price", "/products/search?minPrice=-1", "GET", None, {}, (400,)),
        ("reversed-price", "/products/search?minPrice=200&maxPrice=100", "GET", None, {}, (400,)),
        ("invalid-page-type", "/products/search?page=abc", "GET", None, {}, (400,)),
        ("oversized-recommendation", "/recommendations/popular?limit=25", "GET", None, {}, (400,)),
        ("anonymous-personal", "/recommendations/me", "GET", None, {}, (401, 403)),
        ("anonymous-status", "/admin/ai/status", "GET", None, {}, (401, 403)),
        ("anonymous-reindex", "/admin/ai/reindex", "POST", b"{}", {"Content-Type": "application/json"}, (401, 403)),
        ("anonymous-view", "/interactions", "POST", b'{"productId":1}', {"Content-Type": "application/json"}, (401, 403)),
        ("forged-token", "/recommendations/me", "GET", None, {"Authorization": "Bearer invalid.token.signature"}, (401, 403)),
    ]
    checks = []
    for name, path, method, body, headers, expected in cases:
        observed, _ = request(path, method, body, headers)
        checks.append({"name": name, "status": observed["status"], "expectedStatuses": expected, "passed": observed["status"] in expected})
    recovery = []
    recovery_started = time.perf_counter()
    for attempt in range(18):
        recovery = [search(mode, QUERIES[0]) for mode in ("keyword", "semantic", "hybrid")]
        if all(row["valid"] and not row.get("fallbackReason") for row in recovery):
            break
        time.sleep(2)
    passed = (all(batch["validResponses"] == samples for batch in batches) and all(case["passed"] for case in checks)
              and all(row["valid"] and not row.get("fallbackReason") for row in recovery))
    report = {"capturedAt": datetime.now(timezone.utc).isoformat(), "base": BASE, "platform": platform.platform(),
              "python": platform.python_version(), "samplesPerBatch": samples, "passed": passed,
              "allRequestedModesServed": all(batch["requestedModeResponses"] == samples for batch in batches),
              "scope": "Bounded local warm smoke load, not capacity or production SLA certification; application DB untouched",
              "limitations": ["No real-service outage injected", "No human relevance measurement", "No authenticated security audit", "Only three development queries; no cold-start measurement"],
              "warmup": warmup, "batches": batches, "negativeChecks": checks, "recovery": recovery,
              "recoverySeconds": time.perf_counter() - recovery_started}
    with output.open("x", encoding="utf-8") as target:
        json.dump(report, target, indent=2, allow_nan=False)
    print(json.dumps({"passed": passed, "report": str(output), "negativeChecksPassed": sum(case["passed"] for case in checks),
                      "batches": [{key: value for key, value in batch.items() if key != "observations"} for batch in batches]}, indent=2))
    return passed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bounded acceptance-only load and negative checks; fixed loopback port 18080")
    parser.add_argument("output", type=Path)
    parser.add_argument("--samples", type=int, choices=range(3, 31), default=12)
    args = parser.parse_args()
    raise SystemExit(0 if run(args.output, args.samples) else 1)
