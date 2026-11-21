import argparse
import json
import subprocess

GROUPS = {
    "cloudinary": ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"),
    "vnpay": ("VNP_TMN_CODE", "VNP_HASH_SECRET", "VNP_RETURN_URL"),
}


def readiness(environment):
    return {name: {"configured": all(environment.get(key, "").strip() for key in keys),
                   "missing": [key for key in keys if not environment.get(key, "").strip()],
                   "externalAcceptance": "not_verified"}
            for name, keys in GROUPS.items()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Configuration presence only; never validates payments or prints secrets")
    parser.add_argument("container", choices=("creatshop-docker-test-springboot-1", "creatshop-synthetic-demo-springboot-1"))
    args = parser.parse_args()
    result = subprocess.run(["docker", "inspect", args.container], capture_output=True, text=True, encoding="utf-8", timeout=20)
    if result.returncode:
        raise SystemExit("Cannot inspect the selected test container; check Docker and its name")
    environment = dict(item.split("=", 1) for item in json.loads(result.stdout)[0]["Config"]["Env"] if "=" in item)
    print(json.dumps(readiness(environment), indent=2))
