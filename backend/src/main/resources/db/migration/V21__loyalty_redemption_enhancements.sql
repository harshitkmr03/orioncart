ALTER TABLE loyalty_points
    ADD CONSTRAINT chk_loyalty_balance_non_negative CHECK (points_balance >= 0);

ALTER TABLE loyalty_transactions
    ADD COLUMN is_reversal BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE loyalty_transactions
    ADD COLUMN reversed_tx_id BIGINT REFERENCES loyalty_transactions(id);

CREATE INDEX idx_loyalty_tx_order_type
    ON loyalty_transactions(user_id, reference_id, transaction_type);

CREATE UNIQUE INDEX uq_loyalty_tx_reversed_tx
    ON loyalty_transactions(reversed_tx_id);
