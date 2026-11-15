CREATE TABLE social_identities (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    subject VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    user_id CHAR(36) NOT NULL,
    CONSTRAINT uk_social_subject UNIQUE (provider, subject)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @social_charset = (SELECT CHARACTER_SET_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id');
SET @social_collation = (SELECT COLLATION_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id');
SET @social_columns = CONCAT('ALTER TABLE social_identities MODIFY user_id CHAR(36) CHARACTER SET ',
    @social_charset, ' COLLATE ', @social_collation, ' NOT NULL');
PREPARE social_columns FROM @social_columns;
EXECUTE social_columns;
DEALLOCATE PREPARE social_columns;

ALTER TABLE social_identities
    ADD CONSTRAINT fk_social_user FOREIGN KEY (user_id) REFERENCES users(id);
