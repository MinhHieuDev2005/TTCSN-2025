import argparse
import base64
import json
import secrets
from pathlib import Path

from server import REVISION


def prepare(cache, output):
    cache = cache.resolve()
    snapshot = cache / 'models--intfloat--multilingual-e5-small' / 'snapshots' / REVISION
    if not all((snapshot / name).is_file() for name in ('config.json', 'model.safetensors', 'tokenizer.json')):
        raise ValueError('Pinned model cache is missing; follow docs/AI_DISCOVERY.md first')
    output.parent.mkdir(parents=True, exist_ok=True)
    content = ('DEMO_DB_PASSWORD=' + secrets.token_urlsafe(32) + '\nDEMO_JWT_SECRET='
               + base64.b64encode(secrets.token_bytes(32)).decode() + '\nAI_MODEL_CACHE='
               + json.dumps(cache.as_posix()) + '\n')
    with output.open('x', encoding='utf-8') as target:
        target.write(content)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate private credentials for a new synthetic demo; never overwrites an existing env')
    parser.add_argument('output', type=Path)
    parser.add_argument('--cache', type=Path, default=Path.home() / '.cache/huggingface/hub')
    args = parser.parse_args()
    prepare(args.cache, args.output)
    print('Private demo env created; do not publish it or replace keys for an existing volume.')
