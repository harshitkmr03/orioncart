-- Create master product library table
CREATE TABLE IF NOT EXISTS master_product (
  id SERIAL PRIMARY KEY,
  name VARCHAR(512) NOT NULL,
  brand VARCHAR(255),
  barcode VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
