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
