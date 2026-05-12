-- Flyway migration: create webhook_delivery table for durable webhook queueing
CREATE TABLE IF NOT EXISTS webhook_delivery (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255),
    payment_id BIGINT,
    status VARCHAR(32) DEFAULT 'PENDING',
    attempts INTEGER DEFAULT 0,
    next_attempt_at TIMESTAMP WITH TIME ZONE,
    last_error VARCHAR(1000),
    payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_next ON webhook_delivery (next_attempt_at);
