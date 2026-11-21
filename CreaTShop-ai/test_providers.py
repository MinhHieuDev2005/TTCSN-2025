import json
import re
import unittest
from pathlib import Path

from check_providers import GROUPS, readiness


class ProviderChecks(unittest.TestCase):
    def test_nginx_routes_oauth_to_backend_without_capturing_login_page(self):
        client = Path(__file__).resolve().parent.parent / "CreaTShop-Client"
        for name in ("nginx.demo.conf", "nginx.test.conf"):
            configuration = (client / name).read_text(encoding="utf-8")
            pattern = re.search(r"location ~ (\S+) \{", configuration).group(1)
            for path in ("/api/v1/auths/social/providers", "/oauth2/authorization/google", "/oauth2/authorization/facebook", "/login/oauth2/code/google", "/login/oauth2/code/facebook"):
                self.assertIsNotNone(re.match(pattern, path), (name, path))
            for path in ("/login", "/shop", "/my-order", "/oauth2-other"):
                self.assertIsNone(re.match(pattern, path), (name, path))

    def test_configuration_is_not_external_acceptance_and_does_not_leak_values(self):
        environment = {key: "private-fixture-value" for keys in GROUPS.values() for key in keys}
        report = readiness(environment)
        self.assertTrue(all(group["configured"] for group in report.values()))
        self.assertTrue(all(group["externalAcceptance"] == "not_verified" for group in report.values()))
        self.assertNotIn("private-fixture-value", json.dumps(report))
        environment["VNP_HASH_SECRET"] = "  "
        self.assertEqual(readiness(environment)["vnpay"]["missing"], ["VNP_HASH_SECRET"])
        self.assertFalse(readiness({})["cloudinary"]["configured"])
