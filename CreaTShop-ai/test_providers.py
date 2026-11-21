import json
import unittest

from check_providers import GROUPS, readiness


class ProviderChecks(unittest.TestCase):
    def test_configuration_is_not_external_acceptance_and_does_not_leak_values(self):
        environment = {key: "private-fixture-value" for keys in GROUPS.values() for key in keys}
        report = readiness(environment)
        self.assertTrue(all(group["configured"] for group in report.values()))
        self.assertTrue(all(group["externalAcceptance"] == "not_verified" for group in report.values()))
        self.assertNotIn("private-fixture-value", json.dumps(report))
        environment["VNP_HASH_SECRET"] = "  "
        self.assertEqual(readiness(environment)["vnpay"]["missing"], ["VNP_HASH_SECRET"])
        self.assertFalse(readiness({})["cloudinary"]["configured"])
