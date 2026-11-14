ALTER TABLE order_details
    ADD COLUMN recipient_first_name VARCHAR(255) NULL,
    ADD COLUMN recipient_last_name VARCHAR(255) NULL,
    ADD COLUMN recipient_phone_number VARCHAR(255) NULL,
    ADD COLUMN recipient_country VARCHAR(255) NULL,
    ADD COLUMN recipient_city VARCHAR(255) NULL,
    ADD COLUMN recipient_district VARCHAR(255) NULL,
    ADD COLUMN recipient_commune VARCHAR(255) NULL,
    ADD COLUMN recipient_address_detail VARCHAR(255) NULL,
    ADD COLUMN recipient_description VARCHAR(255) NULL;
