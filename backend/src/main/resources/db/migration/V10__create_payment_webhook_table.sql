-- Flyway migration: create payment_webhook table for idempotency tracking
CREATE TABLE IF NOT EXISTS payment_webhook (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255) UNIQUE,
    payment_id BIGINT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_key ON payment_webhook (idempotency_key);
