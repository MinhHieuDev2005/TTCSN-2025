# AI discovery

## Implemented scope

- Optional description (4000 characters), material, style and occasion (200 each), including admin forms and customer detail display.
- Keyword, semantic and hybrid search with backend pagination, category, price and same-variant color/size/stock filters.
- Conservative positive audience inference from Vietnamese/English query markers, enforced through existing category types before ranking in every mode. `appliedFilters.audiences` exposes inferred MEN/WOMEN/BOY/GIRL constraints; explicit category filters intersect them. See the audience follow-up below for intentionally unsupported ambiguous queries.
- Vietnamese budget patterns: `duoi/toi da/khong qua`, `tren/toi thieu`, `tu ... den ...`; accents and units VND/dong, k/nghin/ngan, trieu are supported. Explicit price filters override inferred bounds individually. Bounds are inclusive. Other natural-language constraints are semantic text, not guaranteed hard filters.
- Personalization from authenticated views, current cart products and delivered orders; similar products; delivered-order popularity fallback. Without delivered orders, ties use descending product ID. The UI labels this fallback "Featured products", not "best sellers".
- Asynchronous indexing with content hashes and model versions, timeout, and a 30-second query-encoder failure cooldown.

This is an initial content-based system, not collaborative filtering or a claim of measured recommendation quality.

## Database upgrade

Take a verified backup, stop application writes, select the application database in MySQL, and apply **once**, after previous project migrations:

```sql
SOURCE CreaTShop-server/creatshop/database/20261116-ai-discovery.sql;
```

The script adds nullable columns and two tables. It does not rewrite prices, stock, payments or historical orders. MySQL DDL is not transactional; inspect partial failures and restore a verified backup instead of blindly rerunning. Foreign keys cascade deleted users/products from the new tables.

This migration is required even with AI disabled: search/recommendation APIs and authenticated views use the new tables. Hibernate does not create these JDBC-managed tables. Fresh databases need the migration after the base schema and earlier migrations too. Restart with `spring.jpa.hibernate.ddl-auto=validate`.

## Local model service

Use Python 3.11 or 3.12 and a dedicated environment:

```powershell
py -3.11 -m venv CreaTShop-ai/.venv
CreaTShop-ai/.venv/Scripts/python.exe -m pip install -r CreaTShop-ai/requirements.txt
CreaTShop-ai/.venv/Scripts/python.exe CreaTShop-ai/server.py
```

First startup downloads `intfloat/multilingual-e5-small` at revision `614241f622f53c4eeff9890bdc4f31cfecc418b3`; allow network access/disk space and wait for "Embedding service ready". Never disable TLS verification to fix download failures. CPU is default; `AI_DEVICE` selects another supported device. Readiness is exposed only after model loading.

Encoding uses query/passage prefixes, normalized 384-dimensional vectors and a 512-token input limit. Put important product attributes early because long descriptions are truncated by the tokenizer. The backend validates dimensions and version `multilingual-e5-small-v1`. Change the version in both services and rebuild all embeddings if model/revision/preprocessing changes.

Before starting the backend in a separate terminal:

```powershell
$env:AI_ENABLED = 'true'
$env:AI_URL = 'http://127.0.0.1:8001'
```

Default is `AI_ENABLED=false`: keyword search and featured fallback remain available. No paid model API or external API key is used.

Query encoding times out after 5 seconds (AI_TIMEOUT_MS); background indexing allows 60 seconds per batch (AI_INDEX_TIMEOUT_MS). Increase the latter for slower CPUs. Model readiness includes a warm-up encoding.

## APIs and indexing

Paths are relative to `/api/v1`; responses preserve the existing meta/data envelope.

| Method / path | Access | Purpose |
| --- | --- | --- |
| GET `/products/search` | Public | q, mode=keyword/semantic/hybrid, categoryIds=1,2, minPrice, maxPrice, color, sizeFilter, inStock, sort=relevance/asc/desc, page, size |
| POST `/interactions` | Authenticated | Body: productId; VIEW only |
| GET `/recommendations/me?limit=8` | Authenticated | Personalized or featured fallback |
| GET `/recommendations/popular?limit=8` | Public | Delivered-order popularity |
| GET `/products/{id}/similar?limit=4` | Public | Related in-stock products, excluding source |
| GET `/admin/ai/status` | Admin | Model version, indexed/pending counts, run state, last error |
| POST `/admin/ai/reindex` | Admin | 202 starts reconciliation; 409 means disabled/already running |

Search returns items, totalItems, page, size, mode, fallbackReason and appliedFilters. Maximum query length is 500, page size is 60, recommendation limit is 24. Price sorting intentionally overrides relevance.

With AI enabled, reconciliation starts after 15 seconds and checks every minute, encoding up to 16 products per batch. Existing valid vectors are reused. Content depends on product/category descriptions, metadata and colors, not volatile prices/stock. Query-time hash checks ignore deleted/changed products. Failed indexing can retry automatically or through the admin endpoint.

If any filtered candidate lacks a current valid vector, the query falls back entirely to keyword mode (`INDEX_NOT_READY`), avoiding silently mixed scores. Other reasons are `AI_DISABLED` and `AI_UNAVAILABLE`. Similar/personalized results use current valid vectors or featured fallback; model downtime does not prevent recommendations from stored vectors.

## Signals and limits

Views use the authenticated principal, one stored event per user/product/30-minute UTC bucket. User/event-type fields from clients cannot create cart/purchase signals. Each account can store at most 60 new product views/minute; gateway request-rate limiting is still needed. Views older than 90 days are excluded and purged daily, starting one hour after startup. No behavioral data or account identifiers are sent to the encoder.

Initial experimental weights: latest view decays as exp(-days/30), current cart product adds 3, each product in delivered orders within 180 days adds 5. Cart contents are not historical add-to-cart events. Pending/canceled orders do not count as purchases. Popularity counts distinct delivered orders/product within 90 days.

Hybrid score is 0.8*cosine + 0.2*tokenMatchFraction. These weights are not empirically optimized. Previously viewed/purchased products may appear; there is no diversity reranker.

The first deployment targets one backend instance and a small thesis catalog. Catalog/vector scans run in-process; there is no ANN index, distributed job lock or durable queue. Measure before scaling; multiple instances need a database lease/queue and scalable retrieval. The stdlib model HTTP server is internal: use loopback locally and an unpublished Docker port. Add production ingress/authentication if crossing a trust boundary.

## Docker

### Isolated Docker acceptance completed (November 17, 2026)

#### Frontend and end-to-end extension (November 17, 2026)

The standalone test stack now also serves the built React frontend at **`http://127.0.0.1:15173`**, proxying `/api/` to its own `springboot` service. The frontend is built with `VITE_API_URL=/api/v1`; native `.env` and existing frontend settings are not changed. Its dedicated `nginx.test.conf` preserves SPA deep links and disables proxy buffering for chat SSE. Only this acceptance stack mounts that configuration. The frontend Docker build uses Node 22 and `npm ci`; a build-context allowlist excludes local environment files, node_modules, copied server folders, tests and generated output.

`CreaTShop-Client/tests/docker.browser.mjs` refuses a frontend without the isolated acceptance marker, uses the fixed loopback test address, and runs against real APIs (not mocked API fixtures). It creates a fresh synthetic account with an example.invalid email, records real product views, adds an in-stock variant to its own cart, creates a synthetic shipping address, places a COD order and cancels it through the UI. Assertions cover the exact price/variant, stock reservation and full stock restoration, empty cart after checkout, personalized/similar recommendations, login/session protection, deep-link reload and mobile overflow. Test accounts, addresses, views and canceled orders are intentionally retained in the private Docker copy and must be excluded from real behavior/quality evaluation. No main database, real payment gateway or shipping service is used.

Run with the already installed Playwright module (no new package is needed; `PLAYWRIGHT_MODULE` may point to its ESM file) and optional ignored evidence directory:

```powershell
$env:EVIDENCE_DIR = (Resolve-Path backups/ai-acceptance-20261116-111819/docker-acceptance-20261117).Path
node CreaTShop-Client/tests/docker.browser.mjs
```

The live browser run passed **10 scenario groups**, with zero JavaScript errors and zero unexpected failed API responses. Rapid full-page navigation produced two `429` chat-stream rate limits; these are recorded separately, and successful SSE reconnection was explicitly required before passing. No chat rate limit was disabled or backend chat code changed. External resources were deliberately blocked (155 requests in the passing run), so the screenshot verifies layout/image fallback, not third-party image availability. Previous failed test reports are retained rather than rewritten.

Four Docker services remain running. The MySQL/model ports are still unpublished; frontend/backend remain loopback-only. The extended checker accepts exactly the three backend services plus optional frontend and validates its binding. Frontend build and all 10 Node unit-test files passed. Full-project ESLint currently reports 16 errors and two warnings in existing source files outside this Docker/browser-test change (including user.api.js, Slider.jsx and component prop validation); those unrelated issues were not silently fixed and lint is not claimed green. No production deployment, external payment, public TLS or recommendation-quality certification is implied.

After Docker Desktop became available, a separate **standalone** Compose file was added at `CreaTShop-server/creatshop/docker-compose.test.yml`. Do not merge it with the base/AI files: it intentionally replaces the whole stack to avoid inherited public ports, container names and init data. Its fixed project name for the acceptance checker is `creatshop-docker-test`. Only the backend publishes `127.0.0.1:19080`; MySQL and embeddings have no host ports. MySQL persists in project-scoped `test-mysql-data`. Existing native MySQL/backend/model services are not changed.

The private environment file is `backups/ai-acceptance-20261116-111819/docker-acceptance-20261117/compose.env`. It contains independent randomly generated database/JWT secrets, `ACCEPTANCE_SQL` pointing to the verified complete AI-schema dump, and `AI_MODEL_CACHE` pointing to the verified Hugging Face hub cache. Never commit this file or its SQL/customer data. For another machine, prepare equivalent private values and a verified migrated snapshot before starting. The Docker stack disables payment/cloud/OAuth credentials, validates schema (no Hibernate update/create), mounts the snapshot read-only for first-time initialization, and mounts model cache read-only with offline inference enabled. Builds still need network access for base images and packages. The compose test is an acceptance fixture, not a production deployment template.

Run from repository root with the existing private file:

```powershell
docker compose --env-file backups/ai-acceptance-20261116-111819/docker-acceptance-20261117/compose.env -f CreaTShop-server/creatshop/docker-compose.test.yml -p creatshop-docker-test up -d --build --wait --wait-timeout 300
py -3.11 CreaTShop-ai/check_docker.py backups/ai-acceptance-20261116-111819/docker-acceptance-20261117/compose.env backups/new-docker-verification.json
```

The checker enforces the project/service identity, loopback-only backend binding, unpublished database/model ports and dedicated MySQL data volume. It mints a short-lived acceptance-only admin token in memory from the copied account and independent key; no account identifiers, password hashes or tokens are included in the report. It checks a complete current index, nine keyword/semantic/hybrid searches without fallback, anonymous admin/personal denial and similar-product source exclusion. These are functional checks, not human relevance scores. Changing the environment file password does not reset credentials in an initialized MySQL volume. The healthcheck queries the restored embedding table so backend startup waits for initialized data.

Live results: both images built, offline real-model inference passed with verified weight SHA-256 and 384 normalized dimensions; all 149 product vectors were current; all nine search cases passed. The private MySQL container was then force-recreated with the backend stopped: its container ID changed, its named volume remained, and complete canonical schema/data dump hashes before/after were identical. Backend/API smoke acceptance was rerun after restart. This did not recreate or restart native application/acceptance services. Do not run `down -v`; stop this test project without deleting data:

```powershell
docker compose --env-file backups/ai-acceptance-20261116-111819/docker-acceptance-20261117/compose.env -f CreaTShop-server/creatshop/docker-compose.test.yml -p creatshop-docker-test stop
```

Private evidence under `docker-acceptance-20261117` includes build/start logs, model verification, API verification and persistence verification. Installed image runtime versions are torch `2.15.0+cpu` and sentence-transformers `6.3.0`; weights use the pinned revision documented below. The torch/base-image dependencies are not fully locked, so this is verified image acceptance, not a bit-reproducible future build guarantee. No frontend container, public HTTPS ingress, Docker load capacity, production rollout or off-machine disaster recovery is claimed.

Deployment caveat (November 17, 2026): the current base Compose declares `mysql-data` but does not mount it at `/var/lib/mysql`; the init-script bind mount is not a database backup. Do not recreate a running database container or run `down -v`. Inspect existing mounts, take and verify a logical backup, then plan an explicit data-volume migration before deploying. Adding a new named-volume mount blindly can hide the current container's data. The backend publishes port 8080, so do not run this stack alongside an application using that port without an isolated deployment configuration.

The AI build context now allowlists only Dockerfile, requirements.txt and server.py, excluding the local virtual environment, caches, generated review pages and test artifacts. Compose configuration validation passed with throwaway validation variables. Docker Desktop's Linux engine was unavailable locally on November 17, so no image build, container startup or runtime health acceptance is claimed.

After migrations, from CreaTShop-server/creatshop with existing database/JWT environment variables:

```powershell
docker compose -f docker-compose.yml -f docker-compose.ai.yml up --build
```

The overlay adds an unpublished model service, model-cache volume and backend configuration. Startup waits for model readiness. Existing databases are not automatically migrated.

## Verification and evaluation

### Acceptance backup/restore drill (November 17, 2026)

The following tool is restricted to the existing private database `creatshop_ai_acceptance` on loopback port 3309. It checks all base tables use InnoDB, creates a consistent logical dump, restores into a randomly named new private schema, re-dumps and compares full schema/data SHA-256. It never drops a database or overwrites prior evidence; source schema changes must be paused during the operation. Passwords are supplied through the child process environment, not command-line arguments. Use a fresh output directory:

```powershell
py -3.11 CreaTShop-ai/check_restore.py backups/ai-acceptance-20261116-111819 backups/new-restore-drill
```

The live drill restored 16 tables; both 1,415,481-byte canonical dump hashes matched (`8a413294c701991d7ffaf1f9afccd111a7b68f45bd00017a93e6584d63c4f290`). Private evidence is under `backups/ai-acceptance-20261116-111819/restore-drill-20261117-v2/verification.json`. The earlier failed attempt is retained separately and was not reported as successful. The restored private schema and SQL artifacts remain for inspection, with no destructive cleanup. These files contain copied customer data: never publish them. This verifies a logical database restore only, not Docker volume loss, external image storage, encryption, off-machine recovery or production RTO/RPO. Sixteen Python tests passed.

```powershell
./scripts/test-backend.ps1
./scripts/test-mysql.ps1 -Repeat 1
python -m unittest discover -s CreaTShop-ai -p 'test_*.py'
python CreaTShop-ai/evaluate_search.py --self-test
node CreaTShop-Client/tests/discovery.browser.mjs
```

Backend discovery checks use isolated H2 and a deterministic fake encoder, not the application database. MySQL checks use a private instance and verify migration preservation/cascades. Python HTTP tests use a fake model and need no ML dependencies.

Browser tests require the frontend on port 5173 and Playwright as in the existing browser suites; PLAYWRIGHT_MODULE can point to an installed Playwright ESM module. All browser-test API traffic is mocked.

Curate a held-out JSON list using actual catalog IDs, independent grades 0..3 and rows shaped like:

```json
[{"query":"summer office shirt","judgments":{"1":3,"2":0},"exhaustive":false}]
```

The IDs/grades shown are format examples, not ground truth. With a fully indexed system, run:

```powershell
python CreaTShop-ai/evaluate_search.py path/to/held-out.json --cutoff 10
```

The script compares keyword/semantic/hybrid Precision@K and NDCG@K. Recall@K is reported only for exhaustively judged rows. Semantic/hybrid fallback aborts evaluation instead of silently producing misleading results. Latency percentiles are sequential samples, not a concurrent load benchmark; record hardware, model revision, catalog size and warm/cold state.

Remaining thesis work: independently labeled Vietnamese queries, time-split recommendation evaluation using historical-only profiles/popularity, human relevance review, load/security testing and deployment acceptance. Synthetic fixtures/unit tests are not proof of recommendation quality.

Rollback: disable AI_ENABLED for keyword/featured behavior and retain the additive schema and stored data.

## Verification status (November 16, 2026)

Verified: backend build, 32 regression groups on H2 and private MySQL, AI migration preservation/cascades on private MySQL, 67 discovery assertions using a fake encoder, existing customer/chat/social HTTP suites, frontend build/lint, 10 frontend unit-test files, 72 customer browser scenarios, 10 live-update browser scenarios, and 5 new discovery browser scenarios including mobile widths. Python model-service contract tests and metric self-check also pass.

The ML dependency installed in an ignored local virtual environment, but the real model-weight download did not complete during initial verification. At that point, real inference, relevance quality and Docker runtime deployment had not been verified. No application database migration or backend restart was performed.

### Acceptance environment, November 16, 2026

A consistent InnoDB snapshot of the local application database was restored to a separate MySQL instance bound to `127.0.0.1:3309`. The AI migration passed on this copy: all original table row counts and all non-product table checksums remained unchanged. The copy contains 149 products and 28 users. The source database was not migrated.

The isolated backend binds to `127.0.0.1:18080`, uses schema validation and a separate JWT signing secret, and clears payment, cloud image and OAuth integration credentials. Only this copy may be used for acceptance writes. Its scheduled payment-expiration job can change copied pending payments; it is not a read-only archive.

Live checks passed for catalog pagination, non-overlapping pages, explicit `INDEX_NOT_READY` fallback, featured recommendations and rejection of anonymous personal/admin requests. Authenticated checks also passed for admin indexing status, personal recommendation access by two copied accounts and rejection of customer access to admin status. These checks do not establish semantic-search or personalization quality.

The initial real-model download encountered connection resets and a read timeout over verified HTTPS. The loader was stopped rather than left retrying indefinitely. Initial status was `total=149`, `indexed=0`, `pending=149`, `lastError=INDEX_FAILED`. This initial blocker was resolved in the real-model follow-up below; partial weights must never be used.

Local artifacts are excluded from Git under `backups/ai-acceptance-20261116-111819/`: `snapshot.sql`, `verification.json`, private credentials, backend logs and process IDs. Treat the entire directory as sensitive customer data. The snapshot SHA-256 and restored row counts are recorded in `verification.json`. Do not publish the snapshot or credentials. The path to this run is also recorded in `CreaTShop-server/creatshop/target/ai-acceptance-path.txt`.

The existing application JAR is locked by its running process, so Maven packaging could not rename it. The acceptance backend instead starts from freshly compiled `target/classes` and the existing dependency classpath. The application process was not stopped. Avoid rebuilding or cleaning these classes while acceptance runs.

### Real-model follow-up, November 16, 2026

The complete 470,641,600-byte model was downloaded from the pinned official Hugging Face revision using resumable HTTPS ranges. Its SHA-256 matches the repository's `x-linked-etag`: `1a55775f53449dac10a2bcbc312469fac40b96d53198c407081a831f81c98477`. The CDN response ETag is different and must not be mistaken for the file SHA-256. Verified weights and tokenizer/configuration files are now installed in the standard persistent Hugging Face cache, outside Maven's `target` directory. Loading the normal `server.py` model configuration offline also passed.

Live integration exposed a request-framing defect: Spring's streaming JSON request lacked the fixed Content-Length required by the Python service. `EmbeddingClient` now uses Spring's buffering request factory. The deterministic encoder test now rejects chunked or missing-length requests, matching the Python contract. All 67 isolated discovery assertions pass with this stricter contract. Only the acceptance backend was restarted to apply the fix.

The real CPU model is ready at `127.0.0.1:18001`, and indexing completed with `total=149`, `indexed=149`, `pending=0`, `lastError=null`. Live checks passed for:

- Real 384-dimensional normalized embeddings and consistent repeated inputs.
- Six Vietnamese queries in each of semantic and hybrid modes (12 searches), without keyword fallback.
- Natural-language maximum/range price bounds on all returned products.
- Personalized recommendations for two copied accounts, with different observed lists.
- Server-owned view identity/event type, repeated-view deduplication and rejection of customer admin access.
- Similar recommendations excluding the source product.

Search request timings in this small sequential smoke run ranged from 172 to 282 ms. These are not a load benchmark or a performance SLA. The results and reproducible copy-only check are in `backups/ai-acceptance-20261116-111819/real-ai-verification.json` and `backups/ai-acceptance-20261116-111819/check-live-ai.py`:

```powershell
py -3.11 backups/ai-acceptance-20261116-111819/check-live-ai.py
```

The model is also cached for the normal service startup without network access. On a free port, use the existing `server.py` with `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`, `OMP_NUM_THREADS=4` and `MKL_NUM_THREADS=4`. The currently running acceptance model already occupies port 18001. Application DB credentials/configuration and the existing frontend were not changed.

Important relevance limitation: all 149 products still have empty description/material/style/occasion fields. Some smoke results are visibly unsuitable: the query for women's work shoes returns children's shoes near the top. Passing the smoke checks proves real inference, filtering and integration, not recommendation/search quality. Enrich truthful product metadata and use independently labeled held-out judgments before tuning weights or reporting Precision/NDCG/Recall. No relevance-quality metric is claimed here.

A live stop/restart outage drill was not executed because the execution policy rejected that command. Outage fallback remains covered by the isolated deterministic regression suite, not by a new real-service outage result. Docker runtime acceptance and application DB rollout are still pending.

### Metadata and evaluation follow-up

The acceptance copy now has 149 factual descriptions derived only from existing names and categories; material/style/occasion remain unverified and empty. All embeddings were refreshed. A reproducible workspace contains 20 rule-labeled development queries, before/after measurements and 1,192 blank human judgments. Hybrid Precision@5 increased from 0.81 to 0.87 on the rule-labeled set, not on independent human relevance labels. The women's-work-shoes query still has unsuitable top results. See `docs/AI_EVALUATION.md` for provenance, limitations, commands and the pending human/held-out protocol. No application database rollout was performed.

### Audience constraint follow-up

The women's-work-shoes audience failure is now fixed on the acceptance API. Vector similarity alone did not guarantee that an explicit adult/child audience would be honored. `SearchAudience` infers a positive audience set and `DiscoveryService` filters by authoritative category types before keyword, semantic or hybrid ranking, including keyword fallback. It does not infer product type from generated marketing prose, change model weights or invent occasion metadata.

Supported markers include accented/unaccented `nam`/`nu`, `be trai`/`be gai`, `tre em nam`/`tre em nu`, generic `tre em`/`cho be`, `nguoi lon` and basic English men/women/boys/girls/children/adults terms. Explicit multiple audiences form a union. A child-specific phrase takes precedence over its embedded gender token. Matching uses word boundaries; accented year/fungus/bud words are not mistaken for `nam`/`nu`, and `Viet Nam` is not a men's audience marker.

Negation and `unisex` are deliberately conservative: inferred audience filtering is skipped rather than reversing an ambiguous request. Numeric `khong qua`/`khong hon` budget phrases do not suppress an otherwise positive audience. Explicit category/price filters continue to apply. This is a limited domain parser, not full natural-language understanding; unsupported negation or implicit family relationships still need human review. When an inferred audience and an explicit category/budget conflict, return zero matches rather than relax either constraint. A female budget of 500,000 in the current acceptance catalog correctly returns no matches.

Verification: 107 isolated discovery assertions, 54 live audience checks (18 queries across three modes), and the previous real-model acceptance checks passed. `giay nu di lam` now ranks only WOMEN-category products, including women's flats and heels instead of children's shoes. This proves audience correctness for tested cases, not independently judged suitability for office wear. Embeddings remain 149/149 current; no reindex/migration is needed for this filter-only change. Only the isolated backend was restarted.

Local live before/after records are `backups/ai-acceptance-20261116-111819/audience-before.json` and `backups/ai-acceptance-20261116-111819/audience-after.json`. A silver development rerun is `evaluation-v1/audience-filter.json` under the same run. Its label rules overlap directly with enforced audience/category constraints, so high scores are not evidence of a better embedding model or held-out relevance. Historical pre-filter measurements remain unchanged.
