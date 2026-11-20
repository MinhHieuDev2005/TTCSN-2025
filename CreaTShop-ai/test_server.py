import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from server import VERSION, handler_for, validate_request


class FakeArray:
    def tolist(self):
        return [[1.0] + [0.0] * 383]


class FakeModel:
    def encode(self, texts, **kwargs):
        assert texts == ["query: summer shirt"]
        assert kwargs["normalize_embeddings"] is True
        return FakeArray()


class ServerChecks(unittest.TestCase):
    def test_short_contention_waits_instead_of_rejecting(self):
        entered, release = threading.Event(), threading.Event()
        class WaitingModel:
            def encode(self, texts, **kwargs):
                entered.set()
                if not release.wait(3):
                    raise RuntimeError("test timed out")
                return FakeArray()
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(WaitingModel()))
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        statuses = []
        def embed():
            query = urllib.request.Request(f"http://127.0.0.1:{server.server_port}/embed", data=b'{"kind":"query","texts":["test"]}')
            try:
                with urllib.request.urlopen(query, timeout=5) as response:
                    statuses.append(response.status)
            except Exception as error:
                statuses.append(type(error).__name__)
        first = threading.Thread(target=embed)
        timer = threading.Timer(.2, release.set)
        try:
            first.start()
            self.assertTrue(entered.wait(2))
            timer.start()
            embed()
            first.join(5)
            self.assertEqual(statuses, [200, 200])
        finally:
            release.set()
            timer.cancel()
            if first.ident:
                first.join(5)
            server.shutdown()
            server.server_close()
            worker.join()

    def test_busy_failure_and_recovery(self):
        entered, release = threading.Event(), threading.Event()
        class ControlledModel:
            failed = False
            def encode(self, texts, **kwargs):
                entered.set()
                if not release.wait(3):
                    raise RuntimeError("test timed out")
                if not self.failed:
                    self.failed = True
                    raise RuntimeError("simulated model failure")
                return FakeArray()
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(ControlledModel()))
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        base = f"http://127.0.0.1:{server.server_port}"
        statuses = []
        def embed():
            query = urllib.request.Request(base + "/embed", data=b'{"kind":"query","texts":["test"]}')
            try:
                with urllib.request.urlopen(query, timeout=5) as response:
                    return response.status, json.load(response)
            except urllib.error.HTTPError as error:
                return error.code, json.load(error)
        first = threading.Thread(target=lambda: statuses.append(embed()))
        try:
            first.start()
            self.assertTrue(entered.wait(2))
            self.assertEqual(embed(), (503, {"error": "busy"}))
            release.set()
            first.join(5)
            self.assertFalse(first.is_alive())
            self.assertEqual(statuses, [(503, {"error": "encoding_failed"})])
            recovered_status, recovered = embed()
            self.assertEqual(recovered_status, 200)
            self.assertEqual(len(recovered["vectors"][0]), 384)
            with urllib.request.urlopen(base + "/health", timeout=5) as response:
                self.assertTrue(json.load(response)["ready"])
        finally:
            release.set()
            if first.ident:
                first.join(5)
            server.shutdown()
            server.server_close()
            worker.join()

    def test_validation(self):
        self.assertEqual(validate_request({"kind": "passage", "texts": [" shirt "]}), ["passage: shirt"])
        for value in [None, [], {}, {"kind": "other", "texts": ["x"]},
                      {"kind": "query", "texts": []}, {"kind": "query", "texts": [" "]},
                      {"kind": "query", "texts": ["x"] * 17}, {"kind": "query", "texts": [1]}]:
            with self.assertRaises(ValueError):
                validate_request(value)

    def test_http_contract(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(FakeModel()))
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            with urllib.request.urlopen(base + "/health") as response:
                self.assertEqual(json.load(response)["modelVersion"], VERSION)
            request = urllib.request.Request(base + "/embed", data=json.dumps({"kind": "query", "texts": ["summer shirt"]}).encode(), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(request) as response:
                result = json.load(response)
                self.assertEqual(len(result["vectors"][0]), 384)
            request = urllib.request.Request(base + "/embed", data=b"{}")
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(request)
            self.assertEqual(error.exception.code, 400)
        finally:
            server.shutdown()
            server.server_close()
            worker.join()


if __name__ == "__main__":
    unittest.main()
