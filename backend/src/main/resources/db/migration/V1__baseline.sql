-- Flyway baseline migration for orioncart
-- Add your initial schema objects here.

CREATE TABLE IF NOT EXISTS app_meta (
  id SERIAL PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL UNIQUE,
  value_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

