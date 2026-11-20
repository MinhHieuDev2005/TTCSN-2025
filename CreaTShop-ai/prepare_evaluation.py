import argparse
import csv
import hashlib
import json
import random
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

AUDIENCES = {"MEN": "nam", "WOMEN": "n\u1eef", "BOY": "b\u00e9 trai", "GIRL": "b\u00e9 g\u00e1i"}
RULES = [
    ("s01", "gi\u00e0y d\u00e9p d\u00e0nh cho nam", ("MEN",), None, None),
    ("s02", "gi\u00e0y d\u00e9p d\u00e0nh cho n\u1eef", ("WOMEN",), None, None),
    ("s03", "gi\u00e0y d\u00e9p cho b\u00e9 trai", ("BOY",), None, None),
    ("s04", "gi\u00e0y d\u00e9p cho b\u00e9 g\u00e1i", ("GIRL",), None, None),
    ("s05", "gi\u00e0y d\u00e9p tr\u1ebb em", ("BOY", "GIRL"), None, None),
    ("s06", "gi\u00e0y d\u00e9p ng\u01b0\u1eddi l\u1edbn", ("MEN", "WOMEN"), None, None),
    ("s07", "sandal nam", ("MEN",), "sandal", None),
    ("s08", "d\u00e9p nam", ("MEN",), "dep", None),
    ("s09", "gi\u00e0y t\u00e2y nam", ("MEN",), "giay tay", None),
    ("s10", "sandal b\u00e9 trai", ("BOY",), "sandal", None),
    ("s11", "sandal b\u00e9 g\u00e1i", ("GIRL",), "sandal", None),
    ("s12", "d\u00e9p b\u00e9 g\u00e1i", ("GIRL",), "dep be gai", None),
    ("s13", "gi\u00e0y t\u1eadp \u0111i cho b\u00e9 trai", ("BOY",), "giay tap di", None),
    ("s14", "gi\u00e0y t\u1eadp \u0111i cho b\u00e9 g\u00e1i", ("GIRL",), "giay tap di", None),
    ("s15", "gi\u00e0y t\u1eadp \u0111i tr\u1ebb em", ("BOY", "GIRL"), "giay tap di", None),
    ("s16", "gi\u00e0y b\u00fap b\u00ea b\u00e9 g\u00e1i", ("GIRL",), "giay bup be", None),
    ("s17", "gi\u00e0y d\u00e9p nam d\u01b0\u1edbi 500 ngh\u00ecn", ("MEN",), None, (None, 500000)),
    ("s18", "gi\u00e0y d\u00e9p n\u1eef t\u1eeb 300 ngh\u00ecn \u0111\u1ebfn 700 ngh\u00ecn", ("WOMEN",), None, (300000, 700000)),
    ("s19", "gi\u00e0y d\u00e9p b\u00e9 trai d\u01b0\u1edbi 400 ngh\u00ecn", ("BOY",), None, (None, 400000)),
    ("s20", "gi\u00e0y d\u00e9p b\u00e9 g\u00e1i d\u01b0\u1edbi 400 ngh\u00ecn", ("GIRL",), None, (None, 400000)),
]
HUMAN_QUERIES = [
    "gi\u00e0y n\u1eef \u0111i l\u00e0m",
    "d\u00e9p \u0111i bi\u1ec3n d\u01b0\u1edbi 300 ngh\u00ecn",
    "gi\u00e0y cho b\u00e9 m\u1edbi t\u1eadp \u0111i",
    "gi\u00e0y nam ch\u1ea1y b\u1ed9 bu\u1ed5i s\u00e1ng",
    "sandal n\u1eef \u0111i ch\u01a1i",
    "gi\u00e0y th\u1ec3 thao cho b\u00e9 g\u00e1i",
    "gi\u00e0y t\u00e2y nam d\u01b0\u1edbi 700 ngh\u00ecn",
    "d\u00e9p b\u00e9 trai d\u1ec5 ph\u1ed1i \u0111\u1ed3",
]

def normalize(value):
    return "".join(character for character in unicodedata.normalize("NFD", value.lower().replace("\u0111", "d")) if unicodedata.category(character) != "Mn").strip()

def csv_safe(row):
    return {key: "'" + value if isinstance(value, str) and (value.lstrip().startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n"))) else value for key, value in row.items()}

def proposed_metadata(product, category):
    audience = AUDIENCES[category["type"]]
    description = f"T\u00ean s\u1ea3n ph\u1ea9m: {product['name']}. Danh m\u1ee5c: {category['name']}. Nh\u00f3m kh\u00e1ch h\u00e0ng theo danh m\u1ee5c: {audience}."
    return {field: product.get(field) or (description if field == "description" else "") for field in ("description", "material", "style", "occasion")}

def silver_queries(products, categories):
    queries = []
    for query_id, query, types, category_name, bounds in RULES:
        judgments = {}
        for product in products:
            category = categories[product["categoryId"]]
            minimum, maximum = bounds or (None, None)
            relevant = (category["type"] in types and (category_name is None or normalize(category["name"]) == category_name)
                        and (minimum is None or product["price"] >= minimum) and (maximum is None or product["price"] <= maximum))
            judgments[str(product["id"])] = 1 if relevant else 0
        if not any(judgments.values()):
            raise ValueError(f"No relevant products for rule {query_id}")
        queries.append({"id": query_id, "query": query, "judgments": judgments, "exhaustive": True,
                        "rule": {"audiences": types, "categoryNameNormalized": category_name, "priceBounds": bounds}})
    return queries

def review_pairs(manifest):
    products = set(manifest["productIds"])
    pools = manifest.get("queryProductIds")
    if pools is None:
        return {(query, product) for query in manifest["humanQueries"] for product in products}
    if not isinstance(pools, dict) or set(pools) != set(manifest["humanQueries"]):
        raise ValueError("Pool must cover every query")
    for values in pools.values():
        if not isinstance(values, list) or not values or any(not isinstance(value, str) for value in values):
            raise ValueError("Pool needs non-empty product ID lists")
        if len(set(values)) != len(values) or not set(values) <= products:
            raise ValueError("Duplicate or unknown pooled product")
    return {(query, product) for query, values in pools.items() for product in values}

def finalize_review(workspace, reviewer):
    manifest = json.loads((workspace / "manifest.json").read_text(encoding="utf-8"))
    if hashlib.sha256((workspace / "catalog.json").read_bytes()).hexdigest() != manifest["catalogSha256"]:
        raise ValueError("Catalog snapshot changed after review preparation")
    expected = review_pairs(manifest)
    queries = {}
    with (workspace / "human-review.csv").open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            query_id, product_id = row["query_id"], row["product_id"]
            if query_id not in manifest["humanQueries"] or row["query"] != manifest["humanQueries"][query_id]:
                raise ValueError("Unknown or changed query in review")
            if row["grade"] not in ("0", "1", "2", "3") or (query_id, product_id) not in expected:
                raise ValueError("Every product needs a reviewer grade 0..3; blank is unjudged, not zero")
            query = queries.setdefault(query_id, {"id": query_id, "query": row["query"], "judgments": {}, "exhaustive": "queryProductIds" not in manifest})
            if product_id in query["judgments"]:
                raise ValueError("Duplicate judgment")
            query["judgments"][product_id] = int(row["grade"])
    if {(query_id, product) for query_id, query in queries.items() for product in query["judgments"]} != expected:
        raise ValueError("Review must cover every expected query/product pair")
    if any(not any(query["judgments"].values()) for query in queries.values()):
        raise ValueError("Queries with no relevant products need a separate no-answer evaluation")
    return {"provenance": {"labelSource": "human-reviewed", "humanReviewed": True, "reviewer": reviewer, "catalogSha256": manifest["catalogSha256"], "selection": manifest.get("selection", "development queries; not an independent held-out set")}, "queries": list(queries.values())}

def prepare_pool(workspace, output, base, cutoff):
    if not 1 <= cutoff <= 60:
        raise ValueError("Pool depth must be between 1 and 60")
    if output.exists():
        raise FileExistsError(output)
    catalog = (workspace / "catalog.json").read_bytes()
    manifest = json.loads((workspace / "manifest.json").read_text(encoding="utf-8"))
    if hashlib.sha256(catalog).hexdigest() != manifest["catalogSha256"]:
        raise ValueError("Catalog snapshot changed")
    snapshot = json.loads(catalog)
    products = {str(product["id"]): product for product in snapshot["products"]}
    categories = {category["id"]: category for category in snapshot["categories"]}
    pools, runs, rows = {}, {}, []
    for query_id, query in manifest["humanQueries"].items():
        ids, runs[query_id] = set(), {}
        for mode in ("keyword", "semantic", "hybrid"):
            params = urllib.parse.urlencode({"q": query, "mode": mode, "size": cutoff})
            with urllib.request.urlopen(base.rstrip("/") + "/products/search?" + params, timeout=30) as response:
                data = json.load(response)["data"]
            if data.get("mode") != mode or data.get("fallbackReason"):
                raise ValueError(f"Cannot pool {query_id}/{mode}: fallback or wrong mode")
            ranked = [str(product["id"]) for product in data["items"]]
            if len(ranked) != len(set(ranked)) or len(ranked) > cutoff or not set(ranked) <= products.keys():
                raise ValueError("Duplicate, unknown or excessive retrieved products")
            for product in data["items"]:
                original = products[str(product["id"])]
                if any(product.get(field) != original.get(field) for field in ("name", "categoryId", "price")):
                    raise ValueError("Catalog changed; export a fresh snapshot before pooling")
                if any((product.get(field) or "") != (original.get(field) or "") for field in ("description", "material", "style", "occasion")):
                    raise ValueError("Product metadata changed; export a fresh snapshot before pooling")
            runs[query_id][mode] = ranked
            ids.update(ranked)
        if not ids:
            raise ValueError(f"{query_id}: no candidates; needs separate no-answer evaluation")
        shuffled = sorted(ids, key=int)
        random.Random(query_id).shuffle(shuffled)
        pools[query_id] = shuffled
        for product_id in shuffled:
            product = products[product_id]
            category = categories[product["categoryId"]]
            rows.append(csv_safe({"query_id": query_id, "query": query, "product_id": product_id,
                                  "name": product["name"], "category": category["name"], "audience": category["type"],
                                  "price": product["price"], "description": product.get("description") or "", "grade": "", "notes": ""}))
    manifest.update({"queryProductIds": pools, "poolDepth": cutoff,
                     "selection": "Union of keyword/semantic/hybrid top results; development queries, not held-out; pooled NDCG only, no full-catalog recall"})
    review_pairs(manifest)
    output.mkdir(parents=True, exist_ok=False)
    (output / "catalog.json").write_bytes(catalog)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (output / "retrieval-runs.json").write_text(json.dumps({"capturedAt": datetime.now(timezone.utc).isoformat(), "base": base,
        "cutoff": cutoff, "catalogSha256": manifest["catalogSha256"], "queries": manifest["humanQueries"], "runs": runs}, indent=2), encoding="utf-8")
    with (output / "human-review.csv").open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Prepared {len(rows)} blank pooled judgments; keep retrieval-runs.json hidden from reviewers")

def prepare(base, output):
    def get(path):
        with urllib.request.urlopen(base.rstrip("/") + path, timeout=20) as response:
            return json.load(response)["data"]
    groups = get("/categories")
    categories = {category["id"]: category for group in groups for category in group["categories"]}
    products, page, total = [], 1, None
    while True:
        data = get("/products/search?" + urllib.parse.urlencode({"mode": "keyword", "size": 60, "page": page}))
        if total is not None and total != data["totalItems"]:
            raise ValueError("Catalog count changed during export")
        total = data["totalItems"]
        products.extend(data["items"])
        if len(products) >= data["totalItems"]:
            break
        if not data["items"]:
            raise ValueError("Catalog pagination ended early")
        page += 1
    products.sort(key=lambda product: product["id"])
    if not products or len(products) != total or len({product["id"] for product in products}) != len(products):
        raise ValueError("Empty or unstable catalog snapshot; pause catalog edits before exporting")
    if any(product["categoryId"] not in categories or categories[product["categoryId"]]["type"] not in AUDIENCES for product in products):
        raise ValueError("Unknown product category or audience")
    snapshot = {"products": products, "categories": list(categories.values())}
    serialized = json.dumps(snapshot, ensure_ascii=True, sort_keys=True).encode()
    checksum = hashlib.sha256(serialized).hexdigest()
    silver = {"provenance": {"labelSource": "category-price-rules", "humanReviewed": False, "catalogSha256": checksum,
                             "limitations": "Silver category membership, not human relevance or held-out evaluation; do not tune and claim independent quality on this set"},
              "queries": silver_queries(products, categories)}
    output.mkdir(parents=True, exist_ok=False)
    (output / "catalog.json").write_bytes(serialized)
    (output / "silver.json").write_text(json.dumps(silver, indent=2, ensure_ascii=True), encoding="utf-8")
    with (output / "metadata.csv").open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=["product_id", "name", "category", "audience", "description", "material", "style", "occasion", "source", "reviewed"])
        writer.writeheader()
        for product in products:
            category = categories[product["categoryId"]]
            writer.writerow(csv_safe({"product_id": product["id"], "name": product["name"], "category": category["name"], "audience": category["type"],
                                      **proposed_metadata(product, category), "source": "Existing product name and category; no material or usage inferred", "reviewed": "false"}))
    query_map = {f"h{index + 1:02d}": query for index, query in enumerate(HUMAN_QUERIES)}
    with (output / "human-review.csv").open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=["query_id", "query", "product_id", "name", "category", "audience", "price", "description", "grade", "notes"])
        writer.writeheader()
        for query_id, query in query_map.items():
            shuffled = products.copy()
            random.Random(query_id).shuffle(shuffled)
            for product in shuffled:
                category = categories[product["categoryId"]]
                writer.writerow(csv_safe({"query_id": query_id, "query": query, "product_id": product["id"], "name": product["name"], "category": category["name"],
                                          "audience": category["type"], "price": product["price"], "description": product.get("description") or "", "grade": "", "notes": ""}))
    manifest = {"catalogSha256": checksum, "productIds": [str(product["id"]) for product in products], "humanQueries": query_map}
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=True), encoding="utf-8")
    print(f"Prepared {len(products)} metadata rows, {len(RULES)} silver queries, {len(query_map) * len(products)} blank human judgments in {output}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:18080/api/v1")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--finalize", type=Path)
    parser.add_argument("--reviewer")
    parser.add_argument("--pool", type=Path, help="Existing frozen workspace to pool top results from")
    parser.add_argument("--pool-depth", type=int, default=10)
    args = parser.parse_args()
    if args.pool:
        if not args.output or args.finalize:
            parser.error("--pool requires --output and cannot be combined with --finalize")
        prepare_pool(args.pool, args.output, args.base, args.pool_depth)
    elif args.finalize:
        if not args.reviewer or not args.reviewer.strip():
            parser.error("--reviewer is required for completed human judgments")
        try:
            result = finalize_review(args.finalize, args.reviewer.strip())
        except (ValueError, FileNotFoundError) as error:
            parser.error(str(error))
        with (args.finalize / "human-reviewed.json").open("x", encoding="utf-8") as output:
            json.dump(result, output, indent=2, ensure_ascii=True)
    elif args.output:
        prepare(args.base, args.output)
    else:
        parser.error("use --output for preparation or --finalize with --reviewer")

if __name__ == "__main__":
    main()
