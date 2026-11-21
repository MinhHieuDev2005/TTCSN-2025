import argparse
import base64
import hashlib
import hmac
import json
import shlex
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


PROJECT = "creatshop-docker-test"
BASE = "http://127.0.0.1:19080/api/v1"


def docker(*arguments):
    result = subprocess.run(["docker", *arguments], capture_output=True, timeout=60, text=True, encoding="utf-8")
    if result.returncode:
        raise RuntimeError("Docker acceptance command failed; inspect private logs (output intentionally omitted)")
    return result.stdout


def token(username, password, key):
    encode = lambda value: base64.urlsafe_b64encode(value).rstrip(b"=")
    stamp = encode(hmac.new(key, password.encode(), hashlib.sha256).digest()).decode()
    body = encode(b'{"alg":"HS256","typ":"JWT"}') + b"." + encode(json.dumps({"sub": username, "credentials": stamp, "iat": int(time.time()), "exp": int(time.time()) + 600}).encode())
    return (body + b"." + encode(hmac.new(key, body, hashlib.sha256).digest())).decode()


def get(path, bearer=None):
    headers = {"Authorization": "Bearer " + bearer} if bearer else {}
    with urllib.request.urlopen(urllib.request.Request(BASE + path, headers=headers), timeout=20) as response:
        return json.load(response)["data"]


def check(environment_file, output):
    if output.exists():
        raise FileExistsError("Refusing to overwrite Docker evidence")
    private = dict(line.split("=", 1) for line in environment_file.read_text(encoding="utf-8").splitlines() if "=" in line)
    key = base64.b64decode(private["ACCEPTANCE_JWT_SECRET"], validate=True)
    container_ids = docker("ps", "-q", "--filter", f"label=com.docker.compose.project={PROJECT}").split()
    if len(container_ids) not in (3, 4):
        raise RuntimeError("Expected three backend services and optionally the acceptance frontend")
    inspected = json.loads(docker("inspect", *container_ids))
    services = {item["Config"]["Labels"]["com.docker.compose.service"]: item for item in inspected}
    if set(services) not in ({"mysql", "springboot", "embeddings"}, {"mysql", "springboot", "embeddings", "frontend"}):
        raise RuntimeError("Unexpected acceptance services")
    for service in ("mysql", "embeddings"):
        if services[service]["HostConfig"].get("PortBindings"):
            raise RuntimeError("Database and model must not publish host ports")
    bindings = services["springboot"]["HostConfig"]["PortBindings"]
    if bindings != {"8080/tcp": [{"HostIp": "127.0.0.1", "HostPort": "19080"}]}:
        raise RuntimeError("Acceptance backend must bind only loopback port 19080")
    if "frontend" in services and services["frontend"]["HostConfig"]["PortBindings"] != {"80/tcp": [{"HostIp": "127.0.0.1", "HostPort": "15173"}]}:
        raise RuntimeError("Acceptance frontend must bind only loopback port 15173")
    data_mount = [item for item in services["mysql"]["Mounts"] if item["Destination"] == "/var/lib/mysql"]
    if len(data_mount) != 1 or data_mount[0]["Type"] != "volume" or not data_mount[0]["Name"].startswith(PROJECT + "_"):
        raise RuntimeError("Expected project-isolated MySQL data volume")
    sql = "SELECT username,password FROM users WHERE role_id=1 AND status='ACTIVE' LIMIT 1"
    account = docker("exec", services["mysql"]["Id"], "sh", "-c", 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -D creatshop_ai_docker --batch --skip-column-names --execute ' + shlex.quote(sql)).strip().split("\t")
    if len(account) != 2:
        raise RuntimeError("No copied admin account available")
    admin = token(account[0], account[1], key)
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        try:
            status = get("/admin/ai/status", admin)
            if status["total"] > 0 and status["indexed"] == status["total"] and status["pending"] == 0 and not status["running"] and not status["lastError"]:
                break
        except (OSError, ValueError):
            pass
        time.sleep(2)
    else:
        raise RuntimeError("Docker backend/index did not become ready")
    cases = []
    for mode in ("keyword", "semantic", "hybrid"):
        for query in ("giay nu di lam", "sandal nam", "giay cho be tap di"):
            started = time.perf_counter()
            data = get("/products/search?" + urllib.parse.urlencode({"q": query, "mode": mode, "size": 5}))
            if data["mode"] != mode or data.get("fallbackReason") or not data["items"]:
                raise RuntimeError("Docker search returned fallback, empty results or incorrect mode")
            cases.append({"query": query, "mode": mode, "latencyMs": (time.perf_counter() - started) * 1000, "ids": [item["id"] for item in data["items"]]})
    for path in ("/admin/ai/status", "/recommendations/me"):
        try:
            get(path)
        except urllib.error.HTTPError as error:
            if error.code not in (401, 403):
                raise RuntimeError("Unexpected anonymous rejection status") from None
        else:
            raise RuntimeError("Anonymous access was not denied")
    source = cases[0]["ids"][0]
    related = get(f"/products/{source}/similar?limit=4")
    if related["mode"] != "similar" or related.get("fallbackReason") or not related["items"] or any(item["id"] == source for item in related["items"]):
        raise RuntimeError("Docker similar-products check failed")
    report = {"capturedAt": datetime.now(timezone.utc).isoformat(), "passed": True, "project": PROJECT,
              "index": status, "searchChecks": cases, "anonymousAccessDenied": True, "similarExcludesSource": True,
              "mysqlVolume": data_mount[0]["Name"], "hostBinding": "127.0.0.1:19080",
              "images": {name: item["Image"] for name, item in services.items()},
              "scope": "Private copied database, offline cached real model, Docker smoke acceptance; no production quality/SLA claim"}
    with output.open("x", encoding="utf-8") as target:
        json.dump(report, target, indent=2)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check only creatshop-docker-test on fixed loopback port 19080")
    parser.add_argument("environment_file", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    check(args.environment_file, args.output)
