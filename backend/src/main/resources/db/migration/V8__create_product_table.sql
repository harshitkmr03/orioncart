-- Create product inventory table
CREATE TABLE IF NOT EXISTS product (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) UNIQUE,
  name VARCHAR(512) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Example rows
INSERT INTO product (sku, name, quantity) VALUES
('SKU-1001', 'Demo Product A', 10),
('SKU-1002', 'Demo Product B', 5)
ON CONFLICT DO NOTHING;
