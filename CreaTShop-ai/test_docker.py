import base64
import hashlib
import hmac
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from check_docker import check, token


class DockerChecks(unittest.TestCase):
    def test_private_jwt_signature_and_credential_stamp(self):
        key = b"private-test-key"
        encoded = token("test-user", "stored-password-hash", key)
        header, payload, signature = encoded.split(".")
        expected = base64.urlsafe_b64encode(hmac.new(key, (header + "." + payload).encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
        self.assertEqual(signature, expected)
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        self.assertEqual(claims["sub"], "test-user")
        self.assertEqual(claims["exp"] - claims["iat"], 600)
        self.assertNotIn("stored-password-hash", encoded)

    def test_existing_report_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "report.json"
            output.write_text("existing")
            with patch("subprocess.run") as process:
                with self.assertRaises(FileExistsError):
                    check(Path(directory) / "missing.env", output)
                process.assert_not_called()
            self.assertEqual(output.read_text(), "existing")


if __name__ == "__main__":
    unittest.main()
