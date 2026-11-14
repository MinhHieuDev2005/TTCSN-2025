ALTER TABLE order_details
    MODIFY status ENUM('Delivered','Processing','Shipped','Canceled') NULL,
    ADD COLUMN cancellation_reason VARCHAR(50) NULL,
    ADD COLUMN canceled_by VARCHAR(255) NULL,
    ADD COLUMN canceled_at DATETIME(6) NULL;

UPDATE order_details orders
JOIN payment_details payment ON payment.order_id = orders.id
SET orders.status = 'Canceled', orders.cancellation_reason = 'LEGACY_CANCELED'
WHERE orders.status = 'Processing' AND payment.status IN ('CANCELED', 'REFUND_REQUIRED');
