param(
    [string]$MySqlBin = 'C:\Program Files\MySQL\MySQL Server 8.0\bin',
    [ValidateRange(1024, 65535)][int]$Port = 3308,
    [ValidateRange(1, 10)][int]$Repeat = 1,
    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
if ($BackupPath) {
    $BackupPath = (Resolve-Path -LiteralPath $BackupPath).Path
    if ($BackupPath -match '[;\r\n]' -or -not $BackupPath.EndsWith('.sql')) { throw 'Invalid backup path.' }
}
if ($Port -in 3306, 3307) { throw 'Refusing to use an application MySQL port.' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already occupied. No existing server will be used or stopped."
}
$serverBinary = Join-Path $MySqlBin 'mysqld.exe'
$clientBinary = Join-Path $MySqlBin 'mysql.exe'
$adminBinary = Join-Path $MySqlBin 'mysqladmin.exe'
foreach ($binary in @($serverBinary, $clientBinary, $adminBinary)) {
    if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) { throw "Missing MySQL binary: $binary" }
}

$identifier = [guid]::NewGuid().ToString('N')
$database = "creatshop_regression_$identifier"
$rootPassword = [guid]::NewGuid().ToString('N')
$testPassword = [guid]::NewGuid().ToString('N')
$runDirectory = Join-Path $PSScriptRoot "../CreaTShop-server/creatshop/target/mysql-regression-$identifier"
$runDirectory = [IO.Path]::GetFullPath($runDirectory)
$dataDirectory = Join-Path $runDirectory 'data'
$baseDirectory = Split-Path $MySqlBin
$serverLog = Join-Path $runDirectory 'server.log'
$server = $null
$savedEnvironment = @{}
foreach ($name in @('MYSQL_PWD', 'CREATSHOP_TEST_DB_NAME', 'CREATSHOP_TEST_DB_PORT', 'CREATSHOP_TEST_DB_PASSWORD')) {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
    New-Item -ItemType Directory -Path $runDirectory | Out-Null
    Write-Host "Initializing a private MySQL instance on 127.0.0.1:$Port; application data is not used."
    $initializer = Start-Process -FilePath $serverBinary -WindowStyle Hidden -Wait -PassThru -ArgumentList @(
        '--no-defaults', '--initialize-insecure', "--basedir=`"$baseDirectory`"",
        "--datadir=`"$dataDirectory`"", "--log-error=`"$(Join-Path $runDirectory 'initialize.log')`""
    )
    if ($initializer.ExitCode -ne 0) { throw "MySQL initialization failed; see $runDirectory" }
    $server = Start-Process -FilePath $serverBinary -WindowStyle Hidden -PassThru -ArgumentList @(
        '--no-defaults', "--basedir=`"$baseDirectory`"", "--datadir=`"$dataDirectory`"",
        '--bind-address=127.0.0.1', "--port=$Port", '--mysqlx=OFF', '--skip-log-bin',
        '--innodb-buffer-pool-size=64M', '--performance-schema=OFF', "--log-error=`"$serverLog`""
    )
    $connection = @('--no-defaults', '--protocol=TCP', '--host=127.0.0.1', "--port=$Port", '--user=root')
    $env:MYSQL_PWD = $null
    $ready = $false
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        if ($server.HasExited) { throw "Private MySQL exited; see $serverLog" }
        try {
            & $adminBinary @connection --connect-timeout=1 --silent ping *> $null
            if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        } catch {
            if ($server.HasExited) { throw "Private MySQL exited during startup; see $serverLog" }
        }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw "Private MySQL did not become ready; see $serverLog" }
    @"
CREATE DATABASE $database;
CREATE USER 'creatshop_checks'@'%' IDENTIFIED BY '$testPassword';
GRANT ALL PRIVILEGES ON $database.* TO 'creatshop_checks'@'%';
ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPassword';
"@ | & $clientBinary @connection
    if ($LASTEXITCODE -ne 0) { throw 'Could not provision the isolated database.' }
    $env:MYSQL_PWD = $rootPassword
    $migration = Get-Content (Join-Path $PSScriptRoot '../CreaTShop-server/creatshop/database/20261113-payment-refund-status.sql') -Raw
    if ($BackupPath) {
        & $clientBinary @connection "--database=$database" --default-character-set=utf8mb4 "--execute=source $($BackupPath.Replace('\', '/'))"
        if ($LASTEXITCODE -ne 0) { throw 'Restoring the backup into the private database failed.' }
        $statusQuery = 'SELECT CAST(status AS CHAR), COUNT(*) FROM payment_details GROUP BY status ORDER BY CAST(status AS CHAR)'
        $before = @(& $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=$statusQuery")
        if ($LASTEXITCODE -ne 0) { throw 'Could not inspect restored payment statuses.' }
        $migration | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Migration failed on the restored backup.' }
        $after = @(& $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=$statusQuery")
        if ($LASTEXITCODE -ne 0 -or ($before -join "`n") -ne ($after -join "`n")) {
            throw 'Migration changed existing payment status counts.'
        }
        $enumResult = & $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = '$database' AND table_name = 'payment_details' AND column_name = 'status' AND column_type LIKE '%REFUND_REQUIRED%'"
        if ($LASTEXITCODE -ne 0 -or $enumResult -ne '1') { throw 'Migrated enum does not support REFUND_REQUIRED.' }
        Write-Host 'PASS: Application backup restores successfully; migration preserves payment status counts and adds REFUND_REQUIRED.'
    } else {
        $migrationResult = @"
CREATE TABLE payment_details (id INT PRIMARY KEY AUTO_INCREMENT, status ENUM('PENDING','COMPLETED','FAILED','CANCELED'));
INSERT INTO payment_details (status) VALUES ('PENDING'),('COMPLETED'),('FAILED'),('CANCELED');
$migration
INSERT INTO payment_details (status) VALUES ('REFUND_REQUIRED');
SELECT IF(COUNT(*) = 5 AND COUNT(DISTINCT status) = 5, 'MIGRATION_OK', 'MIGRATION_FAILED') FROM payment_details;
"@ | & $clientBinary @connection --batch --skip-column-names "--database=$database"
        if ($LASTEXITCODE -ne 0 -or $migrationResult -notcontains 'MIGRATION_OK') {
            throw 'The migration did not preserve existing statuses or accept REFUND_REQUIRED.'
        }
        Write-Host 'PASS: MySQL migration preserves all legacy statuses and accepts REFUND_REQUIRED.'
    }
    $snapshotMigration = Get-Content (Join-Path $PSScriptRoot '../CreaTShop-server/creatshop/database/20261114-order-snapshots.sql') -Raw
    $variantMigration = Get-Content (Join-Path $PSScriptRoot '../CreaTShop-server/creatshop/database/20261114-unique-variants.sql') -Raw
    if (-not $BackupPath) {
        @"
CREATE TABLE order_item (id INT PRIMARY KEY, quantity INT);
INSERT INTO order_item VALUES (1, 2);
CREATE TABLE product_info (id INT PRIMARY KEY, product_id INT, color VARCHAR(255), size VARCHAR(255), quantity INT);
INSERT INTO product_info VALUES (1, 10, ' Black ', 'm', 3), (2, 10, 'black', 'M', 4);
"@ | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Could not create migration fixtures.' }
        $ErrorActionPreference = 'Continue'
        $variantMigration | & $clientBinary @connection "--database=$database" 2> (Join-Path $runDirectory 'duplicate-migration-error.log')
        $rejected = $LASTEXITCODE -ne 0
        $ErrorActionPreference = 'Stop'
        $unchanged = & $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=SELECT COUNT(*) FROM product_info WHERE id = 1 AND color = ' Black ' AND quantity = 3"
        if (-not $rejected -or $LASTEXITCODE -ne 0 -or $unchanged -ne '1') { throw 'Duplicate preflight did not reject safely.' }
        & $clientBinary @connection "--database=$database" '--execute=DELETE FROM product_info WHERE id = 2'
        if ($LASTEXITCODE -ne 0) { throw 'Could not reset the migration fixture.' }
    }
    $indexCount = & $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'product_info' AND index_name = 'uk_product_color_size'"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect variant index.' }
    if ($indexCount -eq '0') {
        $variantMigration | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Variant migration failed.' }
    } elseif ($indexCount -ne '3') { throw 'Unexpected variant index schema.' }
    $snapshotCount = & $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_item' AND column_name IN ('unit_price','product_name','variant_color','variant_size')"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect snapshot schema.' }
    if ($snapshotCount -eq '0') {
        $snapshotMigration | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Order snapshot migration failed.' }
        $legacyCount = & $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT COUNT(*) FROM order_item WHERE unit_price IS NOT NULL OR product_name IS NOT NULL OR variant_color IS NOT NULL OR variant_size IS NOT NULL'
        if ($LASTEXITCODE -ne 0 -or $legacyCount -ne '0') { throw 'Migration fabricated legacy order snapshots.' }
    } elseif ($snapshotCount -ne '4') { throw 'Partial order snapshot schema.' }
    if (-not $BackupPath) {
        $normalized = & $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=SELECT COUNT(*) FROM product_info WHERE id = 1 AND BINARY color = 'black' AND BINARY size = 'M' AND quantity = 3"
        if ($LASTEXITCODE -ne 0 -or $normalized -ne '1') { throw 'Variant normalization changed IDs or stock.' }
        $ErrorActionPreference = 'Continue'
        & $clientBinary @connection "--database=$database" "--execute=INSERT INTO product_info VALUES (2, 10, 'black', 'M', 4)" 2> (Join-Path $runDirectory 'unique-constraint-error.log')
        $rejected = $LASTEXITCODE -ne 0
        $ErrorActionPreference = 'Stop'
        if (-not $rejected) { throw 'Database accepted duplicate variants after migration.' }
    }
    Write-Host 'PASS: Snapshot migration preserves unknown history; duplicate preflight and unique constraint are safe.'
    if (-not $BackupPath) {
        @"
CREATE TABLE order_details (id INT PRIMARY KEY, status ENUM('Delivered','Processing','Shipped'), total DOUBLE);
ALTER TABLE payment_details ADD COLUMN order_id INT;
INSERT INTO order_details VALUES (1,'Processing',100),(2,'Processing',200),(3,'Processing',300),(4,'Shipped',400);
INSERT INTO payment_details (status, order_id) VALUES ('CANCELED',1),('REFUND_REQUIRED',2),('COMPLETED',3),('CANCELED',4);
"@ | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Could not create cancellation fixtures.' }
    }
    $cancelCount = & $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_details' AND column_name IN ('cancellation_reason','canceled_by','canceled_at')"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect cancellation schema.' }
    if ($cancelCount -eq '0') {
        Get-Content (Join-Path $PSScriptRoot '../CreaTShop-server/creatshop/database/20261114-order-cancellation.sql') -Raw | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Cancellation migration failed.' }
    } elseif ($cancelCount -ne '3') { throw 'Partial order cancellation schema.' }
    if (-not $BackupPath) {
        $cancelResult = & $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=SELECT COUNT(*) FROM order_details WHERE (id IN (1,2) AND status='Canceled' AND cancellation_reason='LEGACY_CANCELED' AND canceled_at IS NULL AND canceled_by IS NULL AND total=id*100) OR (id=3 AND status='Processing' AND total=300) OR (id=4 AND status='Shipped' AND total=400)"
        if ($LASTEXITCODE -ne 0 -or $cancelResult -ne '4') { throw 'Cancellation migration corrupted historical state or totals.' }
    }
    Write-Host 'PASS: Cancellation migration preserves totals and unknown history; only eligible orders are canceled.'
    $recipientColumns = "'recipient_first_name','recipient_last_name','recipient_phone_number','recipient_country','recipient_city','recipient_district','recipient_commune','recipient_address_detail','recipient_description'"
    $recipientCount = & $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_details' AND column_name IN ($recipientColumns)"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect recipient snapshot schema.' }
    if ($recipientCount -eq '0') {
        $beforeRecipients = & $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT COUNT(*), COALESCE(SUM(total), 0) FROM order_details'
        if ($LASTEXITCODE -ne 0) { throw 'Could not inspect existing orders.' }
        Get-Content (Join-Path $PSScriptRoot '../CreaTShop-server/creatshop/database/20261114-order-recipient.sql') -Raw | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Recipient snapshot migration failed.' }
        $afterRecipients = & $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT COUNT(*), COALESCE(SUM(total), 0) FROM order_details'
        if ($LASTEXITCODE -ne 0 -or $beforeRecipients -ne $afterRecipients) { throw 'Recipient migration changed existing orders or totals.' }
        $fabricated = & $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT COUNT(*) FROM order_details WHERE COALESCE(recipient_first_name, recipient_last_name, recipient_phone_number, recipient_country, recipient_city, recipient_district, recipient_commune, recipient_address_detail, recipient_description) IS NOT NULL'
        if ($LASTEXITCODE -ne 0 -or $fabricated -ne '0') { throw 'Migration fabricated historical recipients.' }
    } elseif ($recipientCount -ne '9') { throw 'Partial recipient snapshot schema.' }
    Write-Host 'PASS: Recipient migration preserves orders and totals without fabricating historical addresses.'
    $moneyMigration = Get-Content (Join-Path $PSScriptRoot '../CreaTShop-server/creatshop/database/20261115-exact-money.sql') -Raw
    if (-not $BackupPath) {
        @"
CREATE TABLE products (id INT PRIMARY KEY, price DOUBLE NOT NULL);
INSERT INTO products VALUES (1,123.25),(2,100.001),(3,999999999999999),(4,120.1);
ALTER TABLE payment_details ADD COLUMN amount DOUBLE NULL;
UPDATE payment_details SET amount = id * 100;
UPDATE order_item SET unit_price = 123.25 WHERE id = 1;
INSERT INTO order_item (id, quantity) VALUES (2,1);
"@ | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Could not prepare exact-money migration fixtures.' }
        $ErrorActionPreference = 'Continue'
        $moneyMigration | & $clientBinary @connection "--database=$database" 2> (Join-Path $runDirectory 'money-migration-preflight.log')
        $rejected = $LASTEXITCODE -ne 0
        $ErrorActionPreference = 'Stop'
        $unchanged = & $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND data_type = ''decimal'' AND ((table_name = ''products'' AND column_name = ''price'') OR (table_name = ''payment_details'' AND column_name = ''amount'') OR (table_name = ''order_details'' AND column_name = ''total'') OR (table_name = ''order_item'' AND column_name = ''unit_price''))'
        if (-not $rejected -or $LASTEXITCODE -ne 0 -or $unchanged -ne '0') { throw 'Money preflight rounded values or partially converted columns.' }
        & $clientBinary @connection "--database=$database" '--execute=UPDATE products SET price = 100 WHERE id = 2'
        if ($LASTEXITCODE -ne 0) { throw 'Could not reset rejected money fixture.' }
    }
    $moneyQuery = 'SELECT ''product'', id, CAST(price AS DECIMAL(19,2)) FROM products UNION ALL SELECT ''order'', id, CAST(total AS DECIMAL(19,2)) FROM order_details UNION ALL SELECT ''payment'', id, CAST(amount AS DECIMAL(19,2)) FROM payment_details UNION ALL SELECT ''item'', id, CAST(unit_price AS DECIMAL(19,2)) FROM order_item ORDER BY 1,2'
    $beforeMoney = @(& $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=$moneyQuery")
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect historical monetary values.' }
    $moneyMigration | & $clientBinary @connection "--database=$database"
    if ($LASTEXITCODE -ne 0) { throw 'Exact-money migration failed.' }
    $afterMoney = @(& $clientBinary @connection --batch --skip-column-names "--database=$database" "--execute=$moneyQuery")
    if ($LASTEXITCODE -ne 0 -or ($beforeMoney -join "`n") -ne ($afterMoney -join "`n")) { throw 'Money migration changed historical values.' }
    $moneyColumns = & $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND data_type = ''decimal'' AND numeric_precision = 19 AND numeric_scale = 2 AND ((table_name = ''products'' AND column_name = ''price'') OR (table_name = ''payment_details'' AND column_name = ''amount'') OR (table_name = ''order_details'' AND column_name = ''total'') OR (table_name = ''order_item'' AND column_name = ''unit_price''))'
    if ($LASTEXITCODE -ne 0 -or $moneyColumns -ne '4') { throw 'Money columns were not fully migrated to DECIMAL(19,2).' }
    Write-Host 'PASS: Exact-money migration rejects unsafe rounding and preserves historical values and NULL snapshots.'
    if (-not $BackupPath) {
        @"
CREATE TABLE users (id INT PRIMARY KEY, password VARCHAR(255) NOT NULL);
INSERT INTO users VALUES (1,'unchanged-password-hash'),(2,'unchanged-social-hash');
"@ | & $clientBinary @connection "--database=$database"
        if ($LASTEXITCODE -ne 0) { throw 'Could not create profile migration fixtures.' }
    }
    $profileMigration = Get-Content (Join-Path $PSScriptRoot '../CreaTShop-server/creatshop/database/20261116-profile-security.sql') -Raw
    $beforeProfiles = @(& $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT id,password FROM users ORDER BY id')
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect profile migration fixtures.' }
    $profileMigration | & $clientBinary @connection "--database=$database"
    if ($LASTEXITCODE -ne 0) { throw 'Profile migration failed.' }
    if (-not $BackupPath) {
        $unknownProfiles = & $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT COUNT(*) FROM users WHERE password_configured IS NULL'
        if ($LASTEXITCODE -ne 0 -or $unknownProfiles -ne '2') { throw 'Profile migration guessed legacy password state.' }
        & $clientBinary @connection "--database=$database" '--execute=UPDATE users SET password_configured = TRUE WHERE id = 1'
        if ($LASTEXITCODE -ne 0) { throw 'Could not prepare profile rerun fixture.' }
    }
    $beforeFlags = @(& $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT id,password_configured FROM users ORDER BY id')
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect password states.' }
    $profileMigration | & $clientBinary @connection "--database=$database"
    if ($LASTEXITCODE -ne 0) { throw 'Profile migration is not repeatable.' }
    $afterFlags = @(& $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT id,password_configured FROM users ORDER BY id')
    if ($LASTEXITCODE -ne 0 -or ($beforeFlags -join "`n") -ne ($afterFlags -join "`n")) { throw 'Profile migration changed password states.' }
    $afterProfiles = @(& $clientBinary @connection --batch --skip-column-names "--database=$database" '--execute=SELECT id,password FROM users ORDER BY id')
    if ($LASTEXITCODE -ne 0 -or ($beforeProfiles -join "`n") -ne ($afterProfiles -join "`n")) { throw 'Profile migration changed users or password hashes.' }
    Write-Host 'PASS: Profile migration is repeatable and preserves users, password hashes and unknown legacy states.'
    $env:CREATSHOP_TEST_DB_PORT = "$Port"
    $env:CREATSHOP_TEST_DB_PASSWORD = $testPassword
    for ($iteration = 1; $iteration -le $Repeat; $iteration++) {
        $regressionDatabase = "creatshop_regression_$([guid]::NewGuid().ToString('N'))"
        @"
CREATE DATABASE $regressionDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON $regressionDatabase.* TO 'creatshop_checks'@'%';
"@ | & $clientBinary @connection
        if ($LASTEXITCODE -ne 0) { throw 'Could not provision a clean regression database.' }
        $env:CREATSHOP_TEST_DB_NAME = $regressionDatabase
        Write-Host "MySQL regression run $iteration/$Repeat"
        & (Join-Path $PSScriptRoot 'test-backend.ps1') -MySql
    }
} finally {
    try {
        if ($server -and -not $server.HasExited) {
            $env:MYSQL_PWD = $rootPassword
            try {
                & $adminBinary @connection --connect-timeout=2 shutdown *> $null
            } catch {
                Write-Warning 'Graceful shutdown failed; stopping only the private test process.'
            }
            if (-not $server.WaitForExit(10000)) { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
            Write-Host "Stopped the private MySQL instance on port $Port. Logs remain in $runDirectory"
        }
    } finally {
        foreach ($name in $savedEnvironment.Keys) {
            [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
        }
    }
}
