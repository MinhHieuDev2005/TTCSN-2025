import unittest

from benchmark_recommendations import dataset, evaluate, rank, signals
from server import DIMENSIONS


class RecommendationBenchmarkChecks(unittest.TestCase):
    def test_time_weights_fallback_and_candidates(self):
        events = [{"product": 1, "kind": "VIEW", "day": -1}, {"product": 1, "kind": "VIEW", "day": -2},
                  {"product": 1, "kind": "DELIVERED", "day": -20}, {"product": 1, "kind": "CART", "day": 0},
                  {"product": 2, "kind": "VIEW", "day": -91}, {"product": 2, "kind": "DELIVERED", "day": 1}]
        self.assertEqual(set(signals(events)), {1})
        self.assertAlmostEqual(signals(events)[1], 8.967216100482005)
        products = [{"id": 1, "stock": 1}, {"id": 2, "stock": 1}, {"id": 3, "stock": 0}]
        vectors = {1: [1, 0], 2: [0, 1], 3: [1, 0]}
        self.assertEqual(rank(products, vectors, events, {2: 10}), [1, 2])
        self.assertEqual(rank(products, vectors, [], {2: 10}), [2, 1])
        self.assertEqual(rank(products, vectors, events, {2: 10}, False), [2, 1])

    def test_generated_split_and_no_future_leakage(self):
        data = dataset()
        self.assertEqual(data, dataset())
        self.assertEqual(len(data["products"]), 48)
        vectors = {product["id"]: [float(index == product["group"]) for index in range(DIMENSIONS)]
                   for product in data["products"]}
        report = evaluate(data, vectors)
        cold = [row for row in report["summary"] if row["cohort"] == "cold"]
        self.assertEqual(cold[0]["precision"], cold[2]["precision"])
        data["users"][0]["train"][0]["day"] = 1
        with self.assertRaises(ValueError):
            evaluate(data, vectors)
