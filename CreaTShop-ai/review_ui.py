import argparse
import base64
import csv
import hashlib
import json
from pathlib import Path
from prepare_evaluation import review_pairs


def build(workspace, output):
    catalog = (workspace / "catalog.json").read_bytes()
    manifest = json.loads((workspace / "manifest.json").read_text(encoding="utf-8"))
    if hashlib.sha256(catalog).hexdigest() != manifest["catalogSha256"]:
        raise ValueError("Catalog snapshot changed")
    with (workspace / "human-review.csv").open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        fields, rows = reader.fieldnames, list(reader)
    expected = review_pairs(manifest)
    seen = set()
    for row in rows:
        key = (row["query_id"], row["product_id"])
        if key not in expected or key in seen or row["query"] != manifest["humanQueries"][key[0]]:
            raise ValueError("Unknown, duplicate or changed review row")
        if row["grade"] not in ("", "0", "1", "2", "3"):
            raise ValueError("Invalid grade")
        seen.add(key)
    if seen != expected or not rows:
        raise ValueError("Incomplete review worksheet")
    payload = {"fields": fields, "rows": rows, "catalogSha256": manifest["catalogSha256"]}
    serialized = json.dumps(payload, ensure_ascii=True, sort_keys=True).encode()
    payload["worksheetSha256"] = hashlib.sha256(serialized).hexdigest()
    encoded = base64.b64encode(json.dumps(payload, ensure_ascii=True).encode()).decode()
    template = Path(__file__).with_name("review_ui.html").read_text(encoding="utf-8")
    with output.open("x", encoding="utf-8") as target:
        target.write(template.replace("__PAYLOAD__", encoded))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build a private offline blinded review worksheet")
    parser.add_argument("workspace", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.workspace, args.output)
    print(f"Open locally: {args.output}")
