import base64
import csv
import hashlib
import json
import re
import tempfile
import unittest
from pathlib import Path

from review_ui import build


class ReviewUiChecks(unittest.TestCase):
    def test_snapshot_validation_and_safe_embedding(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            catalog = b'{"products":[]}'
            (workspace / "catalog.json").write_bytes(catalog)
            manifest = {"catalogSha256": hashlib.sha256(catalog).hexdigest(), "humanQueries": {"h01": "shoes"}, "productIds": ["1"]}
            (workspace / "manifest.json").write_text(json.dumps(manifest))
            row = dict(query_id="h01", query="shoes", product_id="1", name="</script><script>alert(1)</script>", category="Shoes", audience="MEN", price="100", description="", grade="", notes="")
            with (workspace / "human-review.csv").open("w", newline="", encoding="utf-8-sig") as target:
                writer = csv.DictWriter(target, fieldnames=list(row))
                writer.writeheader()
                writer.writerow(row)
            output = workspace / "review.html"
            build(workspace, output)
            html = output.read_text(encoding="utf-8")
            payload = json.loads(base64.b64decode(re.search(r"atob\('([^']+)'\)", html)[1]))
            self.assertEqual(payload["rows"][0]["grade"], "")
            self.assertEqual(payload["rows"][0]["name"], row["name"])
            self.assertNotIn(row["name"], html)
            with self.assertRaises(FileExistsError):
                build(workspace, output)
            (workspace / "catalog.json").write_bytes(b"changed")
            with self.assertRaises(ValueError):
                build(workspace, workspace / "invalid.html")


if __name__ == "__main__":
    unittest.main()
