import hashlib
import json
import unittest
import tempfile
from pathlib import Path

from benchmark_recommendations import dataset, evaluate
from prepare_demo import prepare
from server import REVISION


class DemoChecks(unittest.TestCase):
    def test_credentials_are_private_and_not_overwritten(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / 'demo.env'
            with self.assertRaises(ValueError):
                prepare(root, output)
            snapshot = root / 'models--intfloat--multilingual-e5-small' / 'snapshots' / REVISION
            snapshot.mkdir(parents=True)
            for name in ('config.json', 'model.safetensors', 'tokenizer.json'):
                (snapshot / name).write_text('fixture')
            prepare(root, output)
            original = output.read_bytes()
            with self.assertRaises(FileExistsError):
                prepare(root, output)
            self.assertEqual(output.read_bytes(), original)

    def test_shareable_synthetic_evidence_and_bootstrap(self):
        root = Path(__file__).resolve().parent.parent
        folder = root / 'docs/experiments/recommendation-synthetic-20261120'
        for name, checksum in json.loads((folder / 'checksums.json').read_text()).items():
            self.assertEqual(hashlib.sha256((folder / name).read_bytes()).hexdigest(), checksum)
        data = json.loads((folder / 'dataset.json').read_text())
        self.assertEqual(data, dataset())
        vectors = {int(key): value for key, value in json.loads((folder / 'vectors.json').read_text()).items()}
        self.assertEqual(evaluate(data, vectors), json.loads((folder / 'results.json').read_text()))
        schema = (root / 'CreaTShop-server/creatshop/database/demo/01-schema.sql').read_text()
        self.assertEqual(schema.count('CREATE TABLE'), 16)
        self.assertNotIn('INSERT INTO', schema)
        seed = (root / 'CreaTShop-server/creatshop/database/demo/02-seed.sql').read_text(encoding='utf-8')
        self.assertNotIn('INSERT INTO users', seed)
        self.assertEqual(seed.count('INSERT INTO products'), 12)
        self.assertEqual(seed.count('INSERT INTO product_info'), 11)
