# Original catalog rollout - 2026-11-20

## Use this instance

- Customer website: http://127.0.0.1:15173
- Backend: http://127.0.0.1:19080
- Docker project: `creatshop-docker-test`.
- Database: `creatshop_ai_docker`; existing volume retained.
- Port 15174 is a separate synthetic fixture demo, not the original shop.

## Changes and safeguards

Rebuilt the current frontend and recreated only the original frontend service
using `up -d --no-deps --no-build frontend`. No backend, database or model
restart, seed import, schema migration or volume replacement was performed.

Before rollout, a private transaction-consistent SQL dump was created and the
previous frontend image was tagged for rollback. Evidence is in the ignored
`backups/ai-acceptance-20261116-111819/rollout-original-20261120-193017`
directory. Never publish its SQL dump: it contains existing application data.

Before/after hashes matched for all rows in products, product_info and
categories: 149 products, 157 variant rows and 20 categories. Three real hybrid
search smoke checks returned hybrid mode without fallback through port 15173.

The browser suite creates a dedicated synthetic account in this isolated
acceptance database, places a COD order and cancels it to restore stock. Such
test interactions/orders must not be treated as real-user relevance evidence.
Its JSON report and screenshots are stored beside the private backup.

## Remaining acceptance

- Collect independently judged search relevance and recommendation feedback
  on the original catalog. Synthetic benchmarks are not human evaluation.
- Verify actual VNPay sandbox and Cloudinary with authorized credentials.
- Finalize the university-formatted thesis and adviser-approved evaluation.
- Public hosting, HTTPS and off-machine backups remain separate deployment work.
