# Order management - 2026-11-14

## Implemented
- List rows expose only a labeled view icon; quantities replace repeated legacy snapshot warnings.
- Detail dialogs own forward fulfillment, cancellation and COD confirmation. Each action requires confirmation; requests refresh authoritative server state.
- Canceled orders are terminal. Cancellation records a server-controlled reason, actor when known, and timestamp. Late successful VNPay callbacks still require manual refund and never reopen orders.
- Backward fulfillment transitions are rejected by backend state classes, not merely hidden in the UI.
- Filters include local-calendar start/end dates, inclusive of the final day. Reversed ranges show an error; changing filters resets pagination.
- Legacy purchase snapshots remain unknown rather than copying current product names/prices.

## Validation
- H2: all 22 backend regression groups passed, including concurrent stock/payment operations.
- Isolated MySQL 3308: all 22 groups passed twice; migration fixtures verify historical cancellation metadata and totals.
- Fresh application backup restored to isolated MySQL: migrations and all 22 groups passed again.
- Frontend order/product/session checks, targeted ESLint and production build passed. Build retains its existing large-chunk/deprecation warnings.
- Headless Chrome: list/detail, allowed actions, confirmations, cancellation metadata, COD, dates, Escape/focus and widths 390/768/1024/1440 passed. API writes were mocked, never sent to application data.

## Local Deployment
- Backup: `backups/creatshopdb3-20261114-122323-32f625bb.sql` (private, Git-ignored).
- SHA256: `6be753201226626ae66b601eff36e3b061260b88685f10d22e3bf696d96a6784`.
- Applied only `CreaTShop-server/creatshop/database/20261114-order-cancellation.sql` to the application database after restore verification.
- Corrected 17 legacy Processing orders whose payments were CANCELED/REFUND_REQUIRED. Their reason is LEGACY_CANCELED; actor/time remain NULL because historical evidence is absent.
- Verified all 11 table counts, variant IDs/stock, order totals and payment statuses remained unchanged.
- Restarted the packaged backend using `--spring.jpa.hibernate.ddl-auto=validate`; MySQL 3306 was not stopped or reconfigured.

## Deliberate Limits
- Refund execution and returns are separate workflows, not backward status edits. Add them when provider/refund and inventory-return requirements are defined.
- Filtering remains client-side; move it to a paginated API if order volume warrants it.
- Existing shipped/delivered orders with inconsistent legacy payment statuses are not silently rewritten.

## Recipient and Admin Reliability Follow-up
- New orders persist all nine recipient/address fields independently from the customer's address book. Creation, customer lists, admin lists and order details use the same copy. Hibernate excludes these columns from subsequent updates.
- Existing orders are not backfilled. `addressSnapshotAvailable=false` identifies current address-book data rather than a historical recipient. The admin list does not repeat an icon on every legacy row. Admin details and customer history explain the address source; only processing legacy orders need a pre-shipment verification reminder. A missing API flag is unknown, not evidence of a legacy recipient.
- Before deploying this follow-up to an existing database, back up and apply `database/20261114-order-recipient.sql` once. The isolated MySQL migration check verifies that existing rows/totals are preserved and no historical recipient is invented.
- Product/order load failures have persistent alerts and Retry, remove stale actionable rows, and never appear as valid empty results. Superseded requests cannot replace newer results. Product category failures also remain visible and block product creation until retried.
- All five admin screens expose active filter counts even while filters are collapsed. Header labels follow the active management screen; icon-only logout has an accessible name.
- Follow-up verification: 26 backend groups pass on H2 and twice on isolated MySQL 8, including real address-book edits after checkout and unchanged recipient data after cancellation. Frontend utility checks, targeted ESLint, production build, and both VI/EN browser suites pass; browser API responses are mocked and never write application data.

## Recipient Runtime Acceptance - 2026-11-14
- Packaged application commit `bd3ec36` and replaced the outdated local runtime with `target/creatshop-admin-bd3ec36.jar` on port 8080, using `--spring.jpa.hibernate.ddl-auto=validate`. The old JAR remains available for application rollback; the additive columns are backward compatible.
- Preflight backup `backups/creatshopdb3-20261114-194016-bd3ec36-pre-recipient.sql` restored successfully into private MySQL on 3308. Migrations and all 26 backend regression groups passed twice on that instance.
- Took a second backup with the application stopped: `backups/creatshopdb3-20261114-194431-bd3ec36-frozen.sql`, SHA256 `9213f0660cd449cf8cb49917f9503687f77c6e3a112b9889ab2c45ae7d10d6b4`. Applied the nine nullable recipient columns without backfilling historical data. SQL fingerprints and row counts confirm all 11 existing application tables remain unchanged; all 27 original orders are preserved.
- Authenticated read-only Chrome checks passed for all five admin screens in VI and EN against the actual local backend. The admin order API now explicitly returns recipient snapshot availability; unauthenticated admin access remains rejected.
- A separate backend on 8081 and private MySQL on 3308 exercised registration/login, role rejection, checkout recipient snapshots surviving address edits, COD guards, cancellation/stock release, VNPay signatures/amounts/duplicate callbacks, successful fulfillment, failed payment and late success requiring refund. No workflow acceptance writes reached the application database.
- Chrome completed shipment, delivery and COD confirmation through the actual admin dialogs against the isolated backend, and verified new/legacy recipient notes and mobile logout. Both private acceptance processes were stopped afterward; the application backend and MySQL service remain running.
- VNPay callbacks in these checks were synthetic signed provider responses, not a real gateway payment. A human-operated VNPay sandbox transaction remains required before tagging a release. Do not describe this acceptance as proof that the external payment provider integration is production-certified.
- GitHub push and PR checks for application commit `bd3ec36` were successful (4/4). PR #3 still targets `develop`; no release tag, merge into `main`, or production deployment is part of this local acceptance.
