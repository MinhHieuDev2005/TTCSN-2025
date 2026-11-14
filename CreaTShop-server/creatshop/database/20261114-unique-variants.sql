DROP PROCEDURE IF EXISTS migrate_unique_variants;
DELIMITER //
CREATE PROCEDURE migrate_unique_variants()
BEGIN
    IF EXISTS (SELECT 1 FROM product_info WHERE product_id IS NULL OR color IS NULL
            OR size IS NULL OR TRIM(color) = '' OR TRIM(size) = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid variant attributes: resolve manually before migration';
    END IF;
    IF EXISTS (SELECT 1 FROM product_info
            GROUP BY product_id, LOWER(TRIM(color)), UPPER(TRIM(size)) HAVING COUNT(*) > 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duplicate variants: resolve manually, preserving order/cart references';
    END IF;
    UPDATE product_info SET color = LOWER(TRIM(color)), size = UPPER(TRIM(size));
    ALTER TABLE product_info
        MODIFY product_id INT NOT NULL,
        MODIFY color VARCHAR(255) NOT NULL,
        MODIFY size VARCHAR(255) NOT NULL,
        ADD CONSTRAINT uk_product_color_size UNIQUE (product_id, color, size);
END//
DELIMITER ;
CALL migrate_unique_variants();
DROP PROCEDURE migrate_unique_variants;
