ALTER TABLE product ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE product ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE product ADD COLUMN IF NOT EXISTS last_stock_update_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_product_shop_sku ON product(shop_id, sku);
