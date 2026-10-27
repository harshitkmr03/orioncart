-- Migration V23: Add payment_method and payment_status columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER DEFAULT 0;
