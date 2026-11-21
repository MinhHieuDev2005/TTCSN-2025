DROP PROCEDURE IF EXISTS migrate_exact_money;
DELIMITER //
CREATE PROCEDURE migrate_exact_money()
BEGIN
    IF EXISTS (SELECT 1 FROM products WHERE price IS NULL OR price < 0 OR price > 999999999999999 OR price <> ROUND(price, 2))
        OR EXISTS (SELECT 1 FROM order_details WHERE total < 0 OR total > 999999999999999 OR total <> ROUND(total, 2))
        OR EXISTS (SELECT 1 FROM payment_details WHERE amount < 0 OR amount > 999999999999999 OR amount <> ROUND(amount, 2))
        OR EXISTS (SELECT 1 FROM order_item WHERE unit_price < 0 OR unit_price > 999999999999999 OR unit_price <> ROUND(unit_price, 2)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Money values need manual review: negative, above VND limit or more than two decimals; nothing converted';
    END IF;
    ALTER TABLE products MODIFY price DECIMAL(19,2) NOT NULL;
    ALTER TABLE order_details MODIFY total DECIMAL(19,2) NULL;
    ALTER TABLE payment_details MODIFY amount DECIMAL(19,2) NULL;
    ALTER TABLE order_item MODIFY unit_price DECIMAL(19,2) NULL;
END//
DELIMITER ;
CALL migrate_exact_money();
DROP PROCEDURE migrate_exact_money;
