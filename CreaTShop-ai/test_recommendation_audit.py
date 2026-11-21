import json
import tempfile
import unittest
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

from audit_recommendations import assess, audit


class RecommendationAuditChecks(unittest.TestCase):
    def test_read_only_aggregate_report_and_overwrite_guard(self):
        sections = {
            "orders": "Delivered\t5\t1\t2026-06-01\t2026-11-15",
            "history": "1\t1\t1", "items": "6\t5", "views": "VIEW\t7\t2\t2026-11-16\t2026-11-17",
            "catalog": "149\t149", "missing_order_times": "0", "delivery_columns": "",
        }
        stdout = "\n".join(f"__audit_{name}__\n{value}" for name, value in sections.items())
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            (workspace / "private-mysql.json").write_text(json.dumps({"port": 3309, "database": "creatshop_ai_acceptance", "password": "test-secret"}))
            output = workspace / "report.json"
            with patch("subprocess.run", return_value=SimpleNamespace(returncode=0, stdout=stdout)) as process, patch("builtins.print"):
                audit(workspace, output, Path("mysql"))
            args, kwargs = process.call_args
            self.assertNotIn("test-secret", " ".join(args[0]))
            self.assertIn("READ ONLY", kwargs["input"])
            self.assertTrue(kwargs["input"].rstrip().endswith("ROLLBACK;"))
            for operation in ("INSERT ", "UPDATE ", "DELETE ", "ALTER ", "CREATE "):
                self.assertNotIn(operation, kwargs["input"].upper())
            report = json.loads(output.read_text())
            self.assertEqual(report["counts"]["deliveredOrders"], 5)
            self.assertFalse(report["counts"]["hasDeliveryTimestamp"])
            self.assertNotIn("test-secret", output.read_text())
            with patch("subprocess.run") as process:
                with self.assertRaises(FileExistsError):
                    audit(workspace, output, Path("mysql"))
                process.assert_not_called()

    def test_sparse_or_contaminated_history_never_produces_quality_metrics(self):
        counts = {"usersWithTwoDeliveredOrders": 1, "deliveredOrders": 5, "hasDeliveryTimestamp": False, "missingDeliveredOrderTimeOrUser": 0}
        result = assess(counts)
        self.assertFalse(result["qualityMetricsComputed"])
        self.assertTrue(any("timestamp" in reason for reason in result["blockersAndLimitations"]))
        self.assertTrue(any("scripted" in reason for reason in result["blockersAndLimitations"]))
        counts.update(usersWithTwoDeliveredOrders=100, deliveredOrders=1000, hasDeliveryTimestamp=True)
        self.assertFalse(assess(counts)["qualityMetricsComputed"])

    def test_refuses_application_database_before_connecting(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            for port, database in [(3306, "creatshop"), (3309, "creatshop")]:
                (workspace / "private-mysql.json").write_text(json.dumps({"port": port, "database": database}))
                with patch("subprocess.run") as process:
                    with self.assertRaises(ValueError):
                        audit(workspace, workspace / "report.json", Path("mysql"))
                    process.assert_not_called()


if __name__ == "__main__":
    unittest.main()
