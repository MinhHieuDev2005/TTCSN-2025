# Category and user administration - 2026-11-14

## Changes
- Category deletion locks the category and rejects nonempty categories without deleting products, variants or historical order items. Move products before deleting a category.
- Category edits exclude their own ID from duplicate checks. Names are trimmed and compared case-insensitively within their group. Form validation enforces required names/types and 255-character limits.
- A single selected-category confirmation replaces per-row delete dialogs. Closing an editor and opening Add always starts a new empty form. Request guards prevent duplicate submissions.
- Categories support name/group filters and product counts; users support name/email/phone, status and role filters. Both screens use the shared pagination component and accessible icon actions.
- User status changes require confirmation and refresh authoritative server data. Detail dialogs show contact details, role, status and creation time. The first list column is a sequence number, not a database ID.
- Backend status changes require an active administrator, reject self-locking, and protect the last active administrator. A pessimistic lock on the admin role serializes concurrent account-status updates; a newly banned actor cannot continue locking other administrators.
- User directory reads run inside read-only transactions, including when Open Session in View is disabled.

## Verification
- `./scripts/test-backend.ps1`: 24 regression groups passed on H2.
- `./scripts/test-mysql.ps1 -Repeat 2`: all 24 groups passed twice on isolated MySQL port 3308, including concurrent administrator locks and safe category deletion.
- `node CreaTShop-Client/tests/adminDirectory.test.mjs`: search, combined filters, sorting and immutable inputs passed. Existing order/product/session checks also passed.
- Targeted ESLint and the production client build passed; existing bundle-size/deprecation warnings remain.
- Headless Chrome verified edit/create reset, exactly one delete dialog with the correct ID, disabled nonempty-category deletion, user filters/details, self-lock UI, lock/unlock confirmations, Escape and widths 390/768/1024/1440. All write requests were mocked; application records were not changed by browser checks.

## Local Deployment
- No schema migration was required. The packaged backend runs with `--spring.jpa.hibernate.ddl-auto=validate`.
- Backup: `backups/creatshopdb3-20261114-124900-d3941d9d.sql` (private and Git-ignored).
- SHA256: `d38b660863a9eb5ea55c2f4de5b2d1c4b2c0522efaf91ba0d6ab1f75694c1e99`.
- Verified table counts, stock, order totals/statuses and payment statuses were unchanged after restart. MySQL 3306 was not stopped or reconfigured.
- Categories API returned 200 with product counts for all 20 categories; unauthenticated user-list access returned 401; frontend returned 200.

## Limits
- Filters remain client-side; use paginated API queries when data volume warrants it.
- Category-name duplicate checks are application-level, not a normalized database uniqueness constraint. A database constraint requires auditing existing category names first.
- No account-role editing, audit-history feature or category archival workflow was added.
