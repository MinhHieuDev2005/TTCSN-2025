-- Back up first. Select the application database before running this script.
-- Apply once, with application writes stopped. MySQL DDL is not transactional.
ALTER TABLE products
    ADD COLUMN description VARCHAR(4000) NULL,
    ADD COLUMN material VARCHAR(200) NULL,
    ADD COLUMN style VARCHAR(200) NULL,
    ADD COLUMN occasion VARCHAR(200) NULL;

CREATE TABLE product_embeddings (
    product_id INT NOT NULL PRIMARY KEY,
    content_hash CHAR(64) NOT NULL,
    model_version VARCHAR(120) NOT NULL,
    embedding MEDIUMTEXT NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_embedding_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE user_interactions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_id CHAR(64) NOT NULL UNIQUE,
    user_id CHAR(36) NOT NULL,
    product_id INT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL,
    INDEX ix_interaction_user_time (user_id, occurred_at),
    INDEX ix_interaction_time (occurred_at),
    CONSTRAINT fk_interaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_interaction_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
