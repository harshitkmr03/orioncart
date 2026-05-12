-- Flyway migration: add signature column to webhook_delivery
ALTER TABLE webhook_delivery
ADD COLUMN IF NOT EXISTS signature VARCHAR(1000);
