import argparse
import hashlib
import json
import os
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path


def fingerprint(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def check(workspace, output, mysql_bin):
    if output.exists():
        raise FileExistsError("Refusing to overwrite restore evidence")
    config = json.loads((workspace / "private-mysql.json").read_text(encoding="utf-8"))
    if config.get("port") != 3309 or config.get("database") != "creatshop_ai_acceptance":
        raise ValueError("Only the private acceptance database on port 3309 is allowed")
    client, dumper = mysql_bin / "mysql.exe", mysql_bin / "mysqldump.exe"
    if not client.is_file() or not dumper.is_file():
        raise FileNotFoundError("MySQL client and dump binaries are required")
    environment = os.environ.copy()
    environment["MYSQL_PWD"] = config["password"]
    connection = ["--no-defaults", "--protocol=TCP", "--host=127.0.0.1", "--port=3309", "--user=root", "--default-character-set=utf8mb4", "--connect-timeout=3"]

    def execute(command, **kwargs):
        result = subprocess.run(command, env=environment, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120, **kwargs)
        if result.returncode:
            raise RuntimeError("Private restore check failed; database output intentionally omitted. Retain partial files for investigation.")
        return result.stdout

    def dump(database, path):
        execute([str(dumper), *[option for option in connection if not option.startswith("--connect-timeout=")], "--single-transaction", "--skip-lock-tables", "--set-gtid-purged=OFF",
                 "--no-tablespaces", "--hex-blob", "--order-by-primary", "--skip-comments", "--skip-extended-insert",
                 f"--result-file={path.resolve()}", database])

    unsupported = execute([str(client), *connection, "--batch", "--skip-column-names", "--execute",
                           "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='creatshop_ai_acceptance' AND TABLE_TYPE='BASE TABLE' AND COALESCE(ENGINE,'')<>'InnoDB'"]).strip()
    if unsupported != b"0":
        raise ValueError("All source tables must use InnoDB for a consistent logical backup")
    output.mkdir(parents=True, exist_ok=False)
    backup, restored = output / "backup.sql", output / "restored.sql"
    dump("creatshop_ai_acceptance", backup)
    database = "creatshop_restore_" + uuid.uuid4().hex
    execute([str(client), *connection, "--execute", f"CREATE DATABASE `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"])
    with backup.open("rb") as source:
        execute([str(client), *connection, f"--database={database}"], stdin=source)
    dump(database, restored)
    original_hash, restored_hash = fingerprint(backup), fingerprint(restored)
    tables = execute([str(client), *connection, f"--database={database}", "--batch", "--skip-column-names", "--execute", "SHOW TABLES"]).decode().splitlines()
    report = {"capturedAt": datetime.now(timezone.utc).isoformat(), "source": "creatshop_ai_acceptance on loopback 3309",
              "restoreDatabase": database, "tableCount": len(tables), "dumpBytes": backup.stat().st_size,
              "backupSha256": original_hash, "restoredDumpSha256": restored_hash, "passed": original_hash == restored_hash,
              "method": "Consistent InnoDB logical dump, restore into new isolated schema, canonical full schema/data re-dump SHA-256 comparison",
              "privacy": "SQL files contain customer data; keep private and excluded from Git",
              "limitations": ["No application database changed", "No Docker runtime tested", "No simulated disk loss or external image storage restoration", "New private schema and evidence retained; no automatic destructive cleanup", "Freeze schema changes during dump; non-transactional tables are not snapshot-safe"]}
    with (output / "verification.json").open("x", encoding="utf-8") as target:
        json.dump(report, target, indent=2)
    print(json.dumps(report, indent=2))
    if not report["passed"]:
        raise RuntimeError("Restored dump differs; do not claim backup is verified")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Acceptance-only backup/restore drill, fixed private MySQL port 3309")
    parser.add_argument("workspace", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--mysql-bin", type=Path, default=Path("C:/Program Files/MySQL/MySQL Server 8.0/bin"))
    args = parser.parse_args()
    check(args.workspace, args.output, args.mysql_bin)
