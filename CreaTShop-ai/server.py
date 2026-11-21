import argparse
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODEL = "intfloat/multilingual-e5-small"
REVISION = "614241f622f53c4eeff9890bdc4f31cfecc418b3"
VERSION = "multilingual-e5-small-v1"
DIMENSIONS = 384


def validate_request(data):
    if not isinstance(data, dict) or data.get("kind") not in ("query", "passage"):
        raise ValueError("kind must be query or passage")
    texts = data.get("texts")
    if not isinstance(texts, list) or not 1 <= len(texts) <= 16:
        raise ValueError("texts must contain between 1 and 16 items")
    if any(not isinstance(text, str) or not text.strip() or len(text) > 12000 for text in texts):
        raise ValueError("texts must contain non-empty strings up to 12000 characters")
    return [f"{data['kind']}: {text.strip()}" for text in texts]


def handler_for(model):
    gate = threading.BoundedSemaphore(1)

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def reply(self, status, payload):
            body = json.dumps(payload, allow_nan=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path != "/health":
                self.reply(404, {"error": "not_found"})
                return
            self.reply(200, {"ready": True, "modelVersion": VERSION, "dimensions": DIMENSIONS})

        def do_POST(self):
            if self.path != "/embed":
                self.reply(404, {"error": "not_found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if self.headers.get("Transfer-Encoding") or not 0 < length <= 800000:
                    self.reply(413, {"error": "invalid_body_length"})
                    return
                texts = validate_request(json.loads(self.rfile.read(length)))
            except (ValueError, UnicodeError):
                self.reply(400, {"error": "invalid_request"})
                return
            if not gate.acquire(timeout=1):
                self.reply(503, {"error": "busy"})
                return
            try:
                vectors = model.encode(texts, normalize_embeddings=True, batch_size=16).tolist()
                self.reply(200, {"modelVersion": VERSION, "vectors": vectors})
            except Exception:
                self.reply(503, {"error": "encoding_failed"})
            finally:
                gate.release()

        def log_message(self, format_string, *args):
            return

    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(MODEL, revision=REVISION, device=os.getenv("AI_DEVICE", "cpu"), trust_remote_code=False)
    model.max_seq_length = 512
    model.encode(["query: warmup"], normalize_embeddings=True)
    server = ThreadingHTTPServer((args.host, args.port), handler_for(model))
    print(f"Embedding service ready on {args.host}:{args.port}; {VERSION}", flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
