import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from check_restore import check, fingerprint


class RestoreChecks(unittest.TestCase):
    def test_refuses_application_database_and_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for port, database in [(3306, "creatshop"), (3309, "creatshop")]:
                (root / "private-mysql.json").write_text(json.dumps({"port": port, "database": database}))
                with patch("subprocess.run") as process:
                    with self.assertRaises(ValueError):
                        check(root, root / "new", root)
                    process.assert_not_called()
            with self.assertRaises(FileExistsError):
                check(root, root, root)

    def test_hash_detects_changed_restore(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            original, restored = root / "original.sql", root / "restored.sql"
            original.write_bytes(b"CREATE TABLE example(id INT);\n")
            restored.write_bytes(original.read_bytes())
            self.assertEqual(fingerprint(original), fingerprint(restored))
            restored.write_bytes(original.read_bytes() + b"INSERT INTO example VALUES(1);\n")
            self.assertNotEqual(fingerprint(original), fingerprint(restored))


if __name__ == "__main__":
    unittest.main()
