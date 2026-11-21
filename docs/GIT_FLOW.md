# Git Flow and release checks

## Branches

- `main`: stable demo/deployment releases only.
- `develop`: integration branch for changes accepted through pull requests.
- `feature/<name>` and `bugfix/<name>`: branch from and PR into `develop`.
- `release/<version>`: branch from `develop`; merge into both `main` and `develop`, tag the release on `main`.
- `hotfix/<name>`: branch from `main`; merge into both `main` and `develop`.

Use separate commits for independently reviewable fixes. Do not push secrets, force-push shared branches, or develop directly on `main`.

On GitHub, protect `main` and `develop`: require a PR, require both `verify` and `mysql-regression` CI checks, block force pushes and deletion. Require a reviewer only if another collaborator is available. CI runs H2 and MySQL regression checks and a clean frontend build. The MySQL job uses an isolated service container and test-only credentials, not application credentials.

## Run checks

From the repository root with Java 17, PowerShell and network access for the first dependency download:

```powershell
./scripts/test-backend.ps1
cd CreaTShop-Client
npm ci
npm run build
```

The backend script compiles the application and runs `RegressionChecks` against a disposable H2 database in MySQL compatibility mode. It overrides datasource settings and does not read the local application properties. Checks use real transactions, concurrent threads, signed synthetic VNPay callbacks and an actual JWT. No additional test runner is required. `mvn test` alone only compiles this assert-based check; use the script to execute it.

`./scripts/test-mysql.ps1 -BackupPath <private-backup.sql> -Repeat 2` restores a local backup and checks migrations on a private MySQL instance, then runs each regression iteration in a separate empty database. The restored schema is never reused for generated fixtures; migrated/custom foreign keys can otherwise prevent Hibernate from resetting tables correctly. Both phases use test-only databases on port 3308; the application database and the backup file are not modified. Keep SQL backups outside Git. Local acceptance results and the remaining real-provider/demo checklist are in `docs/LOCAL_ACCEPTANCE.md`.

Customer fixes are covered by `CreaTShop-Client/tests/customerCheckout.test.mjs` (included in the existing utility CI step) and the backend regression checks, including BCrypt updates, simultaneous cart additions, ownership, overflow and conditional checkout cleanup. These checkout/account fixes do not require a migration; the later exact-money change does, as described below. Existing cart duplicates are merged when the same variant is next added, without dropping their quantities.

Definitively rejected order requests release a saved checkout only after an authenticated order lookup confirms no committed order and the backend successfully cancels the unused payment. Network errors, HTTP 5xx responses and failed reconciliation keep the saved payment for recovery. Checkout errors remain visible inline; a missing saved address never silently selects another address. Regression checks also require every error-message constant to resolve for default and unsupported locales, so ordinary validation failures cannot become HTTP 500 because of missing translations.

For the optional customer browser checks, start Vite, use an already installed Playwright with Chrome, and run `node CreaTShop-Client/tests/customer.browser.mjs`. Set `PLAYWRIGHT_MODULE` to the file URL of its `index.mjs` if it is not resolvable from the project; `CUSTOMER_TEST_URL` defaults to `http://localhost:5173`. Every API request is intercepted, so these browser checks do not modify application data or contact the payment provider.

Customer account updates use authenticated `PUT /api/v1/users` for profile fields only. Password changes use authenticated `PUT /api/v1/users/me/password` with `currentPassword` and `newPassword`, return HTTP 204, and require signing in again. JWTs contain an HMAC credential stamp checked against the current password hash, so changing the password invalidates every previously issued token, including after a server restart. Tokens issued before this upgrade lack that stamp and require a one-time login. No database migration or password reset is required. Ordinary profile editing does not change credentials. Account and address updates use dirty-field writes to avoid restoring a concurrently changed password or archived address ownership.

Address removal archives the existing row by clearing its nullable address-book owner, rather than deleting an order's foreign-key target. Archived addresses disappear from profile/address-book APIs and cannot be read, edited or reused for checkout by the customer. Existing order recipient snapshots and legacy address references remain readable through the authorized order API. No address schema change is required.

`scripts/test-backend.ps1` also source-launches `CustomerHttpChecks` on a random loopback port with a private in-memory H2 database, exercising the real security filter chain, registration, profile editing, password changes, JWT revocation and address deletion after purchase. Its classpath deliberately excludes `target/test-classes` to avoid loading regression-only configuration into the application. Frontend utility checks include `customerForms.test.mjs`; browser checks additionally cover structured signup errors, offline login/shop recovery, explicit variant selection, variant summaries, canceled-order display and keyboard account navigation. No check modifies the normal application's database or performs a real bank transaction.

Checkout retries persist and reuse the original payment ID per account and reconcile against the authenticated order list; an ambiguous response never automatically cancels the order or creates a fresh payment. Web Locks serialize checkout tabs where supported, and the cart is revalidated before creating a payment. Browser storage must remain available for recovery; cross-device recovery requires selecting the existing order rather than starting a new checkout. VNPay returns only clean the matching account/payment snapshot after signature verification and authenticated order confirmation. Cleanup is attempted once, passes `expectedQuantity` to the locked cart mutation, and preserves rows edited since checkout. Unknown cleanup outcomes are reported instead of blindly repeating deletes. The legacy global `pendingVnpayCheckout` value is deliberately ignored, not used to delete cart data.

H2 is not a substitute for a final MySQL 8 integration test and a real VNPay sandbox payment. Before tagging a release, verify successful payment, failed payment, duplicate IPN, checkout abandoned without returning, COD delivery/confirmation, and account banning through the running UI.

On Windows with MySQL Server 8.0 binaries installed, run the same checks on a private MySQL instance:

```powershell
./scripts/test-mysql.ps1 -Repeat 3
```

The script initializes a unique datadir under `target`, binds to loopback port 3308, creates a scoped test user and a disposable database, verifies the enum migration, runs the checks at MySQL's REPEATABLE-READ isolation, then stops only the instance it started. It refuses ports 3306/3307 and occupied ports. Override `-MySqlBin` or `-Port` if necessary. Existing MySQL services are not used or stopped. Test datadirs and logs remain under ignored `target` directories for diagnosis.

To verify a trusted local application dump before modifying the application database:

```powershell
./scripts/test-mysql.ps1 -BackupPath ./backups/<your-backup>.sql
```

This restores the dump only inside the private instance, verifies that migration preserves existing payment status counts, and then runs destructive regression checks only on that disposable copy. Store sensitive dumps in `backups/` (ignored by Git) and keep an additional copy outside this machine. Never pass an untrusted SQL file to the MySQL client.

Acquire the payment row lock before any other database read in payment-changing transactions. A prior consistent read can create a stale MySQL REPEATABLE-READ snapshot even when the payment itself is subsequently locked; this can hide an order just created by another transaction. The duplicate-order concurrency check covers this regression.

## Database upgrade

Google/Facebook login setup, callback URLs, secret environment variables and its schema migration are documented in `docs/SOCIAL_LOGIN.md`. The backend regression script also runs isolated OAuth provider checks; these do not replace a smoke test with configured real provider applications.

Back up the database. Before starting the updated backend against an existing MySQL database, run:

```sql
SOURCE CreaTShop-server/creatshop/database/20261113-payment-refund-status.sql;
```

Run this from the repository root in the MySQL client after selecting the application database. It extends the payment status enum without deleting existing rows. Do not rely on Hibernate `ddl-auto=update` to migrate an existing enum. Fresh databases generated from the updated entities include the new status.

For a database already running the preceding admin changes, back up first and apply the new recipient migration once, before starting the new backend:

```sql
SOURCE CreaTShop-server/creatshop/database/20261114-order-recipient.sql;
```

This adds nine nullable columns only. New orders store an independent, non-updatable recipient copy. Legacy orders keep NULL snapshots and return `addressSnapshotAvailable=false`; their current address-book details are explicitly labelled, never backfilled as historical facts. Test this migration using `./scripts/test-mysql.ps1` on an isolated database. Never run destructive regression checks on the application database.

Before using the exact-money backend with an existing database, stop application writes, take a verified backup, select the correct database in the MySQL client, and run from the repository root:

```sql
SOURCE CreaTShop-server/creatshop/database/20261115-exact-money.sql;
```

The migration changes product prices, order totals, payment amounts and historical unit prices to `DECIMAL(19,2)`. It preflights all four tables before changing any column, refusing negative values, amounts above 999,999,999,999,999 VND or values with more than two decimal places instead of silently rounding them. Review any rejected records manually; do not rewrite purchase history to force the migration through. Existing NULL snapshots and legacy fractional values with at most two decimals are preserved. MySQL DDL is not transactionally rolled back across all four ALTER statements, so keep application writes stopped and restore the backup if a later DDL statement fails. The script is safe to rerun after a successful migration. Restart with `--spring.jpa.hibernate.ddl-auto=validate`; do not rely on `update` for monetary conversions.

The application uses `BigDecimal` end-to-end for persisted monetary values, DTOs, order arithmetic and VNPay comparison. New prices, payments and order totals must be positive whole VND, at most 999,999,999,999,999. This bound keeps single-order amounts exactly representable by the current JavaScript number-based UI. Historical fractional prices remain readable but must be corrected through product administration before a new purchase; historical orders are not recalculated. Invalid totals roll back the complete order and stock reservation. Increasing this bound or supporting fractional currencies also requires a decimal-aware frontend and updated gateway validation.

`scripts/test-mysql.ps1` checks the money migration on its private MySQL instance, including rejected unsafe rounding, exact preservation of legacy fractional/large values and NULL snapshots. `CustomerHttpChecks` also submits a signed synthetic IPN over real HTTP without visiting the return endpoint, verifies replay safety, and checks that a successful return after cancellation explicitly reports `REFUND_REQUIRED`. These are local synthetic checks, not evidence of a real bank transaction.

## VNPay Sandbox Acceptance

On a dedicated sandbox deployment/database, configure the backend VNPay merchant credentials through the existing configuration, expose a public HTTPS backend, and register its `/api/v1/vnpay/ipn` URL with VNPay. The browser return URL must point to the frontend `/payment/vnpay-return` route. A localhost URL is not reachable by the provider. Never paste merchant secrets into source files, commits or test logs.

With provider-approved sandbox payment details, place a VNPay order and complete payment. Close the payment/browser tab before the return page loads; reopen order history and verify that the server-to-server IPN marks the payment completed without a browser return, keeps stock reserved exactly once, and allows fulfillment. Repeat for a declined/expired payment and verify eventual cancellation and stock release. For a late successful payment after cancellation, verify `REFUND_REQUIRED`, no renewed stock reservation, no fulfillment and no pay-again prompt. Reconcile the amount/reference against the provider sandbox records. Refunds remain manual; no automatic refund or live customer support integration is implemented.

Do not report the real sandbox acceptance as passed until the public IPN endpoint and actual provider transaction have both been checked. Local H2/MySQL and synthetic callbacks do not verify the deployed merchant account, network reachability or bank-side behavior.

## Payment rules

- Opening checkout reconciles a saved attempt against the authenticated order API under the same cross-tab lock as submission. Completed/COD orders resolve to order history; verified canceled/failed orders clear only their own attempt and preserve the cart. An unreadable result keeps recovery data and exposes a retry, without creating or canceling orders automatically.
- New checkout uses editable delivery/payment controls and a responsive order summary. Existing unpaid VNPay orders use a separate read-only purchase snapshot, actual order number, server total, original payment deadline and explicit continue/view/cancel actions. Current address-book changes cannot replace the recorded recipient. A payment-only draft is identified as recovery, not as a confirmed order. Refund-required or unknown states cannot be paid here.
- Continue/cancel rechecks server order state before acting. A changed total or different active checkout from another tab requires fresh review. The displayed deadline is informational: browser time never cancels an order or releases stock; server expiry and callback grace remain authoritative.

- Clients can only cancel a pending payment that has no order. Existing orders must use the order cancellation API; terminal payment statuses cannot be reset.
- All order creation, cancellation, payment callbacks, COD confirmation and fulfillment changes serialize on the payment row. Stock uses conditional database decrements and atomic increments inside the same transaction. Lock ordering follows ascending variant IDs.
- A VNPay session expires 15 minutes after payment creation. Regenerating the URL never extends that deadline. The expiration job runs every 60 seconds (override `payments.expiration-check-ms`) and releases pending VNPay stock after an additional 5-minute callback grace period. COD is not auto-expired.
- Successful callbacks after cancellation or expiration become `REFUND_REQUIRED`. They do not reserve stock again or enable shipping. The admin must reconcile the transaction in VNPay and refund it manually; automatic refunds are not implemented. Never reset this status using direct database edits to fulfill an order.
- Cancellation records the canceled order status, reason, actor and time. Legacy payment cancellation flags still take precedence when displaying an old order. Both the API and admin UI block fulfillment of canceled, failed, refund-required and unpaid VNPay orders.
- Customers can cancel only pending-payment orders still processing. Paid or shipped orders require contacting the shop for manual review; there is no online cancellation-request or automatic-refund workflow. Checkout and order history share collapsed, keyboard-accessible conditions explaining stock reservation, COD, expiry and these cancellation limits. Ineligible orders show a reason instead of an unexplained disabled cancel button. Late successful VNPay returns show a reconciliation notice without a payment retry or cart cleanup.

Historical stock discrepancies or old payments that were already reset before this patch require manual reconciliation; this change does not rewrite historical data.
