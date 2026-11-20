import unittest
from pathlib import Path

from export_handover import FILES, validate


class HandoverChecks(unittest.TestCase):
    def test_private_paths_and_credentials_rejected(self):
        self.assertIn('CreaTShop-Client/eslint.config.js', FILES)
        for name in ("backups/snapshot.sql", "src/.env.local", "config/application.properties", "src/key.pem"):
            with self.assertRaises(ValueError):
                validate(Path(name), b"safe")
        with self.assertRaises(ValueError):
            validate(Path("src/example.txt"), b"-----BEGIN " + b"PRIVATE KEY-----")
        validate(Path("src/application.properties.example"), b"password=${SPRING_DATASOURCE_PASSWORD}")
