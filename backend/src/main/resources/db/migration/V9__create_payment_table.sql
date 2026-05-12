-- Payments table for tracking payment intents and status
CREATE TABLE IF NOT EXISTS payment (
  id SERIAL PRIMARY KEY,
  order_id BIGINT,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  provider_payment_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
