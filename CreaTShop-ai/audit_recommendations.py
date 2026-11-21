import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


QUERIES = {
    "orders": "SELECT COALESCE(status,'NULL'),COUNT(*),COUNT(DISTINCT user_id),COALESCE(CAST(MIN(created_at) AS CHAR),''),COALESCE(CAST(MAX(created_at) AS CHAR),'') FROM order_details GROUP BY status",
    "history": "SELECT COUNT(*),COALESCE(SUM(n>=2),0),COALESCE(SUM(n>=3),0) FROM (SELECT user_id,COUNT(*) n FROM order_details WHERE status='Delivered' AND user_id IS NOT NULL GROUP BY user_id) t",
    "items": "SELECT COUNT(*),COUNT(DISTINCT oi.product_id) FROM order_item oi JOIN order_details od ON od.id=oi.order_id WHERE od.status='Delivered'",
    "views": "SELECT event_type,COUNT(*),COUNT(DISTINCT user_id),COALESCE(CAST(MIN(occurred_at) AS CHAR),''),COALESCE(CAST(MAX(occurred_at) AS CHAR),'') FROM user_interactions GROUP BY event_type",
    "catalog": "SELECT COUNT(*),COALESCE(SUM(description IS NOT NULL AND description<>''),0) FROM products",
    "missing_order_times": "SELECT COUNT(*) FROM order_details WHERE status='Delivered' AND (created_at IS NULL OR user_id IS NULL)",
    "delivery_columns": "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='order_details' AND COLUMN_NAME IN ('delivered_at','deliveredAt')",
}


def assess(counts):
    reasons = []
    if counts["usersWithTwoDeliveredOrders"] < 10:
        reasons.append("Fewer than 10 users have two delivered orders; below this project's exploratory cohort floor (not a statistical guarantee).")
    if counts["deliveredOrders"] < 100:
        reasons.append("Fewer than 100 delivered orders; below this project's exploratory event floor (not a statistical guarantee).")
    if not counts["hasDeliveryTimestamp"]:
        reasons.append("No explicit delivery timestamp: current Delivered status and order created_at cannot prove when a purchase became available to a historical profile.")
    if counts["missingDeliveredOrderTimeOrUser"]:
        reasons.append("Some delivered orders lack creation time or user identity.")
    reasons.extend([
        "Acceptance views include scripted interactions; exclude them from organic behavior evaluation.",
        "Current cart, stock, product metadata and vectors are not historical snapshots; do not call the live recommendations endpoint to reconstruct a past profile.",
    ])
    return {"status": "not-ready-for-independent-quality-evaluation", "qualityMetricsComputed": False,
            "blockersAndLimitations": reasons,
            "nextSteps": ["Collect real, consented behavior separately from test traffic; retain a test/source marker.",
                          "Record purchase delivery/status event time and preserve catalog/availability snapshots.",
                          "Freeze a chronological split before tuning; build profiles and popularity using only pre-cutoff signals.",
                          "Compare the same eligible candidates and users against popularity; report cold-start coverage, repeat purchases and missing targets.",
                          "Use Precision@K, Recall@K and NDCG@K only with justified held-out relevance and sufficient users; never replace missing evidence with generated purchases."]}


def audit(workspace, output, mysql):
    if output.exists():
        raise FileExistsError("Refusing to overwrite an audit")
    config = json.loads((workspace / "private-mysql.json").read_text(encoding="utf-8"))
    if config.get("port") != 3309 or config.get("database") != "creatshop_ai_acceptance":
        raise ValueError("Only the isolated acceptance database on port 3309 is allowed")
    environment = os.environ.copy()
    environment["MYSQL_PWD"] = config["password"]
    statements = ["SET TRANSACTION ISOLATION LEVEL REPEATABLE READ", "START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY"]
    for name, query in QUERIES.items():
        statements.extend([f"SELECT '__audit_{name}__'", query])
    statements.append("ROLLBACK")
    process = subprocess.run([str(mysql), "--no-defaults", "--protocol=TCP", "--host=127.0.0.1", "--port=3309",
                              "--user=root", "--database=creatshop_ai_acceptance", "--default-character-set=utf8mb4",
                              "--batch", "--skip-column-names", "--connect-timeout=3"],
                             input=";\n".join(statements) + ";\n", env=environment, capture_output=True, text=True, timeout=30)
    if process.returncode:
        raise RuntimeError("Private database audit failed; credentials and database output intentionally omitted")
    sections, current = {}, None
    for line in process.stdout.splitlines():
        if line.startswith("__audit_") and line.endswith("__"):
            current = line[len("__audit_"):-2]
            sections[current] = []
        elif current is not None:
            sections[current].append(line.split("\t"))
    if set(sections) != set(QUERIES):
        raise ValueError("Incomplete aggregate audit response")
    history = [int(value) for value in sections["history"][0]]
    orders = [{"status": row[0], "orders": int(row[1]), "users": int(row[2]), "firstCreatedAt": row[3], "lastCreatedAt": row[4]} for row in sections["orders"]]
    counts = {"deliveredOrders": sum(row["orders"] for row in orders if row["status"] == "Delivered"),
              "usersWithDeliveredOrders": history[0], "usersWithTwoDeliveredOrders": history[1], "usersWithThreeDeliveredOrders": history[2],
              "deliveredItemRows": int(sections["items"][0][0]), "distinctDeliveredProducts": int(sections["items"][0][1]),
              "catalogProducts": int(sections["catalog"][0][0]), "productsWithDescription": int(sections["catalog"][0][1]),
              "hasDeliveryTimestamp": bool(sections["delivery_columns"]),
              "missingDeliveredOrderTimeOrUser": int(sections["missing_order_times"][0][0])}
    report = {"capturedAt": datetime.now(timezone.utc).isoformat(), "source": "isolated acceptance snapshot; aggregate read-only transaction",
              "counts": counts, "ordersByCurrentStatus": orders,
              "acceptanceInteractions": [{"eventType": row[0], "events": int(row[1]), "users": int(row[2]), "firstAt": row[3], "lastAt": row[4]} for row in sections["views"]],
              "privacy": "No user identifiers, credentials, addresses, tokens or individual order details exported",
              "assessment": assess(counts)}
    with output.open("x", encoding="utf-8") as target:
        json.dump(report, target, indent=2)
    print(json.dumps({"counts": counts, "assessment": report["assessment"], "report": str(output)}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Read-only recommendation data readiness audit; acceptance DB only")
    parser.add_argument("workspace", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--mysql", type=Path, default=Path("C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe"))
    args = parser.parse_args()
    audit(args.workspace, args.output, args.mysql)
