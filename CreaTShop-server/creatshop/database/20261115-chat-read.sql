CREATE TABLE chat_reads (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    viewer_id CHAR(36) NOT NULL,
    customer_id CHAR(36) NOT NULL,
    last_read_id BIGINT NOT NULL,
    CONSTRAINT uk_chat_reader UNIQUE (viewer_id, customer_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @chat_charset = (SELECT CHARACTER_SET_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id');
SET @chat_collation = (SELECT COLLATION_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id');
SET @chat_columns = CONCAT('ALTER TABLE chat_reads MODIFY customer_id CHAR(36) CHARACTER SET ',
    @chat_charset, ' COLLATE ', @chat_collation, ' NOT NULL, MODIFY viewer_id CHAR(36) CHARACTER SET ',
    @chat_charset, ' COLLATE ', @chat_collation, ' NOT NULL');
PREPARE chat_columns FROM @chat_columns;
EXECUTE chat_columns;
DEALLOCATE PREPARE chat_columns;

ALTER TABLE chat_reads
    ADD CONSTRAINT fk_chat_read_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    ADD CONSTRAINT fk_chat_read_viewer FOREIGN KEY (viewer_id) REFERENCES users(id);
