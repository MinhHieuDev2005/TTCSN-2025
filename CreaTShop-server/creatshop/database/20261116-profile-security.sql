SET @profile_migration = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password_configured'),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN password_configured BOOLEAN NULL'
);
PREPARE profile_migration FROM @profile_migration;
EXECUTE profile_migration;
DEALLOCATE PREPARE profile_migration;
