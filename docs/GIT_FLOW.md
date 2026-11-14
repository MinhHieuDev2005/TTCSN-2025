# Git Flow and release checks

## Branches

- `main`: stable demo/deployment releases only.
- `develop`: integration branch, initially based on `main` at `c58b796`.
- `feature/<name>` and `bugfix/<name>`: branch from and PR into `develop`.
- `release/<version>`: branch from `develop`; merge into both `main` and `develop`, tag the release on `main`.
- `hotfix/<name>`: branch from `main`; merge into both `main` and `develop`.

Use separate commits for independently reviewable fixes. Do not push secrets, force-push shared branches, or develop directly on `main`.

The local setup includes `develop` and `bugfix/payment-stock-security`. Publishing branches, committing, merging and configuring GitHub protections are separate maintainer actions; none is performed automatically.

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

Back up the database. Before starting the updated backend against an existing MySQL database, run:

```sql
SOURCE CreaTShop-server/creatshop/database/20261113-payment-refund-status.sql;
```

Run this from the repository root in the MySQL client after selecting the application database. It extends the payment status enum without deleting existing rows. Do not rely on Hibernate `ddl-auto=update` to migrate an existing enum. Fresh databases generated from the updated entities include the new status.

## Payment rules

- Clients can only cancel a pending payment that has no order. Existing orders must use the order cancellation API; terminal payment statuses cannot be reset.
- All order creation, cancellation, payment callbacks, COD confirmation and fulfillment changes serialize on the payment row. Stock uses conditional database decrements and atomic increments inside the same transaction. Lock ordering follows ascending variant IDs.
- A VNPay session expires 15 minutes after payment creation. Regenerating the URL never extends that deadline. The expiration job runs every 60 seconds (override `payments.expiration-check-ms`) and releases pending VNPay stock after an additional 5-minute callback grace period. COD is not auto-expired.
- Successful callbacks after cancellation or expiration become `REFUND_REQUIRED`. They do not reserve stock again or enable shipping. The admin must reconcile the transaction in VNPay and refund it manually; automatic refunds are not implemented. Never reset this status using direct database edits to fulfill an order.
- Canceled orders retain their previous fulfillment status; the payment status is authoritative for cancellation. Both the API and admin UI block fulfillment of canceled, failed, refund-required and unpaid VNPay orders.

Historical stock discrepancies or old payments that were already reset before this patch require manual reconciliation; this change does not rewrite historical data.
