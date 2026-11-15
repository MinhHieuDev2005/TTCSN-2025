CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    from_shop BIT NOT NULL,
    text VARCHAR(2000) NOT NULL,
    client_message_id VARCHAR(36) NOT NULL,
    sent_at DATETIME(6) NOT NULL,
    INDEX idx_chat_customer_id (customer_id, id),
    CONSTRAINT uk_chat_retry UNIQUE (customer_id, sender_id, client_message_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @chat_charset = (SELECT CHARACTER_SET_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id');
SET @chat_collation = (SELECT COLLATION_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id');
SET @chat_columns = CONCAT('ALTER TABLE chat_messages MODIFY customer_id CHAR(36) CHARACTER SET ',
    @chat_charset, ' COLLATE ', @chat_collation, ' NOT NULL, MODIFY sender_id CHAR(36) CHARACTER SET ',
    @chat_charset, ' COLLATE ', @chat_collation, ' NOT NULL');
PREPARE chat_columns FROM @chat_columns;
EXECUTE chat_columns;
DEALLOCATE PREPARE chat_columns;

ALTER TABLE chat_messages
    ADD CONSTRAINT fk_chat_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    ADD CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) REFERENCES users(id);
