# Catalog enrichment and search evaluation

## What was applied

On November 16, 2026, 149 missing descriptions were populated on the **acceptance database only**, `127.0.0.1:3309/creatshop_ai_acceptance`. Descriptions restate existing product names, category names and audience types in Vietnamese. They do not establish merchant verification or add new product specifications. Material, style and occasion remain blank unless genuine source information is available; no fabric, leather, waterproofing or intended-use claims were invented.

The acceptance update was transactional and restricted to the original null descriptions, with name/category preconditions and one-row assertions. Original metadata is preserved in `backups/ai-acceptance-20261116-111819/evaluation-v1/metadata-before.jsonl`. Prices and the other checked product fields remained unchanged. The application database was not updated. All 149 embeddings were refreshed and the real-model acceptance checks passed again.

## Prepare a reproducible workspace

From the repository root, with the acceptance API running:

```powershell
py -3.11 CreaTShop-ai/prepare_evaluation.py --base http://127.0.0.1:18080/api/v1 --output backups/ai-evaluation-next
```

Use a new output directory; existing workspaces are never overwritten. Pause catalog editing during export. The tool saves:

- `catalog.json` and `manifest.json`: product/category snapshot, product IDs and snapshot SHA-256. No account, cart or order data is exported.
- `metadata.csv`: editable factual descriptions, preserved existing attributes, source notes and an initially false review flag. This tool never writes to the database.
- `silver.json`: 20 development queries with category/audience/price-based binary labels over every snapshot product.
- `human-review.csv`: eight development queries crossed with every product, in a deterministic shuffled order. Grades are blank, not automatically assigned. Model ranking and silver grades are not shown.

For the current 149-product copy, the human worksheet contains 1,192 judgments. CSV files use UTF-8 with BOM for Excel; formula-like text is escaped. Do not alter the manifest or snapshot after preparation. The human worksheet intentionally uses the original snapshot facts, not guessed product attributes.

## Silver-label experiment

Silver labels approximate relevance by existing category membership and price. They are useful for checking audience/category retrieval, but can mislabel cross-category products. They are **not independent human judgments, a held-out benchmark, personalization evaluation or proof of shopping suitability**. Do not tune on this set and then report its results as independent model quality.

Explicit opt-in is required:

```powershell
py -3.11 CreaTShop-ai/evaluate_search.py backups/ai-acceptance-20261116-111819/evaluation-v1/silver.json --allow-silver --base http://127.0.0.1:18080/api/v1 --cutoff 5
```

The fixed 20-query, 149-product experiment before/after factual description enrichment produced:

| Mode | Precision@5 Before | Precision@5 After | NDCG@5 Before | NDCG@5 After | Recall@5 Before | Recall@5 After |
| --- | --- | --- | --- | --- | --- | --- |
| Keyword | 0.7200 | 0.8500 | 0.7439 | 0.8644 | 0.3535 | 0.4306 |
| Semantic | 0.6900 | 0.7400 | 0.7103 | 0.7723 | 0.2909 | 0.3460 |
| Hybrid | 0.8100 | 0.8700 | 0.8301 | 0.9207 | 0.3774 | 0.4314 |

Machine-readable results are `before.json` and `after.json` under that workspace. Labels and ranking weights were not changed between the two runs. Recall is computed because these rule labels cover the complete snapshot, not because human relevance is exhaustively known. Request timings are sequential observations, not a load test.

A known failure remains: the Vietnamese query for women's work shoes still returns children's shoes near the top after enrichment. This prevents a claim that real-world relevance is solved despite the silver-score improvement. Do not add unsupported occasion labels just to improve this query.

### Later Audience-Filter Check

The subsequent structured audience filter fixes that specific adult/child mismatch on the acceptance API. For `giay nu di lam`, all tested returned products now belong to WOMEN categories. Office-wear suitability itself still lacks independent human labels. The filter applies equally to keyword, semantic and hybrid modes, intersects explicit category/budget filters and reports inferred types in `appliedFilters.audiences`.

The later `audience-filter.json` run reports Precision@5 0.95 and NDCG@5 1.0 in each mode on the same 20 silver queries. These are **domain-rule checks, not model-quality improvements**: the inferred constraints and silver labels share the same audience/category taxonomy. Precision below one also reflects fixed-cutoff denominators when fewer than five relevant products are available. Keep this run separate from the original metadata-only before/after table and do not present it as an independent benchmark. No human or held-out scores have been produced.

## Human judgments

Have a named reviewer inspect the product facts and, when necessary, verified merchant information. For each query/product row, use:

- `0`: incompatible with the requested audience/type/budget or otherwise irrelevant.
- `1`: weakly related; satisfies only part of the need.
- `2`: relevant with a minor mismatch.
- `3`: strongly matches the need and supported product facts.

Leave a grade blank when evidence is insufficient; do not turn unknown into zero. Add evidence or uncertainty in `notes`. The finalizer rejects blanks, duplicates, unknown product IDs, changed queries, incomplete coverage and a changed snapshot. Queries with no relevant products require a separate no-answer protocol and cannot be silently included in this ranking evaluation. Do not label using model ranking as the answer key.

When all rows are genuinely reviewed:

```powershell
py -3.11 CreaTShop-ai/prepare_evaluation.py --finalize backups/ai-acceptance-20261116-111819/evaluation-v1 --reviewer "actual-reviewer-name"
py -3.11 CreaTShop-ai/evaluate_search.py backups/ai-acceptance-20261116-111819/evaluation-v1/human-reviewed.json --base http://127.0.0.1:18080/api/v1 --cutoff 5
```

The finalizer creates `human-reviewed.json` once, with reviewer and snapshot provenance. It cannot verify who entered the grades; provenance is a reviewer declaration, not an audit signature. **No human-reviewed results exist yet.** These eight queries are development queries, some previously used in smoke tests. A separate unseen query set, written and labeled before further tuning, is still required for held-out thesis results. Recommendation quality likewise needs its own historical/time-split evaluation.

## Offline blinded scoring UI

Generate a private, standalone page from the frozen worksheet (no server, database writes or external requests):

```powershell
py -3.11 CreaTShop-ai/review_ui.py backups/ai-acceptance-20261116-111819/evaluation-v1 backups/ai-acceptance-20261116-111819/evaluation-v1/review.html
```

Open the generated HTML locally. Start with 20-30 judgments to clarify the rubric; this is a development pilot, not a new held-out query set. The page preserves the worksheet's shuffled order, hides retrieval methods/ranks and leaves unknown judgments blank. Enter a reviewer name, download progress JSON before closing, and import that JSON to resume. There is no automatic persistent storage. Keep the HTML and progress private; no customer accounts are included.

Export CSV separately and retain the progress JSON as reviewer-declared provenance. After checking the export, back up the original worksheet and replace `human-review.csv` in the same workspace with the downloaded CSV. Only then run the existing finalizer with the actual reviewer name. Partial pilot exports intentionally fail finalization; unknown is never converted to zero. This UI does not establish reviewer identity or independent human quality. Use separate progress files for separate reviewers.

## Smaller pooled review (November 17, 2026)

Instead of grading all 1,192 pairs, collect the union of each mode's top results per query. Each query/product appears once in the shuffled worksheet, with blank grades and no method/rank in the scoring page. This is inspired by Elasticsearch's explicit rated-document evaluation and handling of unrated results; it is not a reproduction of Elasticsearch scoring.

```powershell
py -3.11 CreaTShop-ai/prepare_evaluation.py --pool backups/ai-acceptance-20261116-111819/evaluation-v1 --output backups/ai-pool-v1 --pool-depth 10 --base http://127.0.0.1:18080/api/v1
py -3.11 CreaTShop-ai/review_ui.py backups/ai-pool-v1 backups/ai-pool-v1/review.html
```

The acceptance API must already be running and metadata must match the frozen snapshot. If metadata changed, export a fresh workspace first; do not overwrite historical snapshots. Any mode fallback, unknown/duplicate retrieved IDs or changed returned product facts abort preparation before creating output. Keep `retrieval-runs.json` private from reviewers. This capture is sequential, not an atomic catalog/model snapshot; pause catalog updates and reindexing during collection.

Use the same CSV export and finalizer workflow after genuine human review. Pooled output has `exhaustive: false`: no full-catalog recall, and NDCG is normalized only against the judged pool. The evaluator now rejects any unjudged result instead of silently scoring it zero. New rankings may therefore require an expanded pool and new judgments. Legacy datasets without human provenance require `--allow-silver`. Reports include per-query IDs/metrics for diagnosis.

The eight development queries remain non-held-out, even when pooled. Existing AI suggestions are not human labels; human review after seeing those suggestions is AI-assisted, not independent blind review. This change produces no human quality score or recommendation-quality claim.

Reference: Elasticsearch rank evaluation documentation, `https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-rank-eval` (rated documents, unknown documents and per-query diagnostics).

## Bounded load and negative checks, November 17, 2026

Run only against the existing loopback acceptance backend (the address is fixed in the tool). It performs no authenticated writes, migrations or process restarts; unauthorized POST probes must be denied. It refuses to overwrite reports and checks readiness before running. Each batch has 12 requests by default, at concurrency 1, 2 and 4, across keyword, semantic and hybrid. Retain raw observations and fallback counts instead of interpreting HTTP 200 as successful AI inference.

```powershell
py -3.11 CreaTShop-ai/check_acceptance.py backups/new-load-report.json
```

The initial run exposed contention: the model's immediate busy response triggered the backend's existing 30-second AI cooldown. Semantic/hybrid requests consequently fell back to keyword, including immediate recovery probes. That initial report remains private as `load-negative-20261117.json`; it failed its recovery check. This was not an injected service outage.

The model now waits up to one second for its single-inference gate before returning `503 busy`. This serializes brief bursts without parallel model inference; it is not a bounded worker queue, capacity guarantee or elimination of fallback under sustained load. Requests still fail safely after the wait. Only the matched private model process on port 18001 was restarted to load this change; no backend or main application restart was required. Deterministic tests cover successful brief contention, rejection when the wait expires, encoding failure, gate release and subsequent successful encoding. The load checker now also allows up to approximately 36 seconds plus request time for cooldown recovery.

The repeat report `load-negative-bounded-wait-20261117.json` recorded **108/108 valid responses in the requested mode, zero fallbacks**, all 13 negative checks passing, and successful recovery probes. Warm local p95 observations, 12 requests per cell:

| Concurrent requests | Keyword p95 ms | Semantic p95 ms | Hybrid p95 ms |
| --- | --- | --- | --- |
| 1 | 115.1 | 133.9 | 123.5 |
| 2 | 128.5 | 120.7 | 130.6 |
| 4 | 108.5 | 163.1 | 146.9 |

Negative checks cover pagination, query length, price range, mode, recommendation limits, anonymous personal/admin/view routes and forged tokens. This is not a full security audit, authenticated cross-account test or production capacity/SLA certification. Only three development queries and a 149-product private catalog were used. JVM/cache warmup and machine load differ between runs: do not claim the latency difference as a controlled speedup. No cold-start, sustained saturation or real-service outage experiment was performed. Eleven Python tests and `git diff --check` passed after the change.

## Live pooled acceptance, November 17, 2026

The existing private MySQL copy (3309), real model (18001) and acceptance backend (18080) were resumed without migrating or restarting the main application. Real-model vector checks, all 149 current embeddings, 12 Vietnamese semantic/hybrid smoke queries, two-account personalization, view ownership/deduplication, customer admin rejection and similar-product source exclusion passed again. These are functional checks, not recommendation-quality scores.

A fresh catalog snapshot is saved privately under `backups/ai-acceptance-20261116-111819/evaluation-20261117`. The separate `pooled-review-20261117/review.html` contains **120 blank judgments over eight development queries**, the deduplicated union of each mode's top 10, instead of 1,192 full-catalog pairs (89.9% fewer). Per-query counts are 15, 17, 18, 11, 18, 14, 13 and 14. Snapshot integrity, exact unions, unique pairs and blank grades were checked. Headless Chrome verified mobile layout, JSON export/import and no JavaScript errors; browser test edits were not saved into the worksheet.

Private reports are `pooled-review-20261117/verification.json` and `real-ai-verification-20261117.json`. Prior snapshots and prior reports are retained. No human grades or independent quality metrics were generated. Do not expose the parent acceptance directory: it also contains copied customer data and credentials. Share only explicitly reviewed non-sensitive artifacts, and keep retrieval ranks hidden from blinded reviewers.

## Recommendation data readiness, November 17, 2026

The next step was a read-only aggregate audit of the isolated MySQL copy, not a fabricated offline score. Reproduce it with a new report path:

```powershell
py -3.11 CreaTShop-ai/audit_recommendations.py backups/ai-acceptance-20261116-111819 backups/new-recommendation-audit.json
```

The tool refuses application ports/databases, never exposes the password on the command line, uses a consistent read-only transaction and exports no user IDs or individual order details. Existing reports are not overwritten. The private result `recommendation-readiness-20261117.json` records:

- 149 products, all with factual descriptions in the acceptance copy.
- Only **5 delivered orders from one user**, comprising six order-item rows and five distinct products.
- Seven VIEW events from two users, collected during acceptance checks; they are not evidence of organic behavior.
- No explicit delivery timestamp in `order_details`. `created_at` is order creation, and current `Delivered` status does not establish when it became known historically. `updated_at` is not silently treated as delivery time.

**No recommendation quality metrics were computed.** One-user history cannot support a credible generalization claim; current carts, inventory, metadata and embeddings also lack historical snapshots. The audit's 10 eligible users / 100 delivered orders checks are local exploratory screening floors only, not a universal benchmark or guarantee of statistical adequacy. Even passing those floors would not resolve timestamp, provenance and candidate-set limitations.

Before a chronological evaluation, collect real consented interactions with source/test provenance; record delivery/status event times; preserve or explicitly constrain historical catalog availability. Freeze the split before tuning. Build each user's profile and the popularity baseline from pre-cutoff events only, compare on the same candidate universe, and report cold-start eligibility, repeated purchases and missing targets. Do not call the live personalized endpoint as an offline time-travel evaluator: it uses current views, cart, delivered-order status and stock. Functional smoke checks remain valid but do not demonstrate relevance quality. AI-generated or scripted behavior may test formulas, never replace genuine held-out outcomes.

## Automated checks (all AI tools)

```powershell
py -3.11 -m unittest discover -s CreaTShop-ai -p "test_*.py"
py -3.11 CreaTShop-ai/evaluate_search.py --self-test
```

Checks cover fact-only metadata, preservation of existing descriptions, CSV formula protection, silver-label rules, incomplete/invalid human judgments, snapshot integrity and ranking metrics, alongside the model HTTP contract. No new packages are required.
