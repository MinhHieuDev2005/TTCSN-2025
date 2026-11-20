import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path


TREES = ("CreaTShop-Client/src", "CreaTShop-Client/public", "CreaTShop-Client/tests",
         "CreaTShop-server/creatshop/src", "CreaTShop-server/creatshop/.mvn",
         "CreaTShop-server/creatshop/database", "docs", "scripts")
FILES = ("README.md", ".gitignore", ".java-version",
         "CreaTShop-Client/package.json", "CreaTShop-Client/package-lock.json",
         "CreaTShop-Client/index.html", "CreaTShop-Client/vite.config.js",
         "CreaTShop-Client/eslint.config.js", "CreaTShop-Client/.gitignore",
         "CreaTShop-server/creatshop/.gitignore",
         "CreaTShop-Client/postcss.config.js", "CreaTShop-Client/tailwind.config.js",
         "CreaTShop-Client/Dockerfile", "CreaTShop-Client/.dockerignore",
         "CreaTShop-Client/nginx.test.conf", "CreaTShop-server/creatshop/pom.xml",
         "CreaTShop-Client/nginx.demo.conf", "CreaTShop-server/creatshop/docker-compose.demo.yml",
         "CreaTShop-server/creatshop/mvnw", "CreaTShop-server/creatshop/mvnw.cmd",
         "CreaTShop-server/creatshop/Dockerfile", "CreaTShop-server/creatshop/.dockerignore",
         "CreaTShop-server/creatshop/docker-compose.test.yml")
BLOCKED = {"backups", "target", "node_modules", ".git", ".idea", ".venv", "__pycache__"}
SECRET = re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{30,}|AIza[A-Za-z0-9_-]{30,}")


def validate(path, data):
    if (any(part in BLOCKED for part in path.parts) or path.parts[0] == "config"
            or path.as_posix().startswith("CreaTShop-server/creatshop/config/")
            or path.name.startswith((".env", "client_secret_"))
            or path.suffix.lower() in {".pem", ".key", ".p12", ".jks", ".log", ".pid"}):
        raise ValueError(f"Private path refused: {path}")
    if SECRET.search(data):
        raise ValueError(f"Potential credential refused: {path}")


def build(root, evidence, output):
    root = root.resolve()
    paths = [root / name for name in FILES]
    for name in TREES:
        paths.extend(path for path in (root / name).rglob("*") if path.is_file())
    paths.extend(path for path in (root / "CreaTShop-ai").iterdir()
                 if path.is_file() and path.suffix in {".py", ".html", ".txt"})
    paths.extend(root / "CreaTShop-ai" / name for name in ("Dockerfile", ".dockerignore"))
    content = {}
    for path in sorted(set(paths)):
        if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ValueError(f"Missing or unsafe source: {path.name}")
        relative = path.relative_to(root)
        data = path.read_bytes()
        validate(relative, data)
        content[relative.as_posix()] = data
    for name in ("schema.sql", "openapi.json"):
        data = (evidence / name).read_bytes()
        validate(Path(name), data)
        if name == "schema.sql" and (b"INSERT INTO" in data.upper() or b"REPLACE INTO" in data.upper()
                                     or b"CREATE TABLE" not in data.upper()):
            raise ValueError("Expected schema only, never a customer dump")
        if name == "openapi.json" and "openapi" not in json.loads(data):
            raise ValueError("Invalid OpenAPI document")
        content["handover/" + name] = data
    manifest = {"scope": "Working-tree source snapshot, schema only and OpenAPI; not a production release or independently secret-audited artifact",
                "excluded": ["Customer rows", "Local credentials", "Original SQL dumps", "Build/runtime caches", "Model weights", "Base production compose"],
                "files": {name: hashlib.sha256(data).hexdigest() for name, data in sorted(content.items())}}
    content["handover/manifest.json"] = json.dumps(manifest, indent=2).encode()
    with zipfile.ZipFile(output, "x", zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(content.items()):
            archive.writestr(name, data)
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise ValueError("Archive CRC check failed")
        for name, checksum in manifest["files"].items():
            if hashlib.sha256(archive.read(name)).hexdigest() != checksum:
                raise ValueError("Archive checksum mismatch")
    return {"files": len(content), "bytes": output.stat().st_size,
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Allowlisted source handover; never exports database rows or local configuration")
    parser.add_argument("evidence", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(json.dumps(build(Path(__file__).resolve().parent.parent, args.evidence, args.output), indent=2))
