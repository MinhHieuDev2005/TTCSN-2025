ALTER TABLE order_item
    ADD COLUMN unit_price DOUBLE NULL,
    ADD COLUMN product_name VARCHAR(255) NULL,
    ADD COLUMN variant_color VARCHAR(255) NULL,
    ADD COLUMN variant_size VARCHAR(255) NULL;
