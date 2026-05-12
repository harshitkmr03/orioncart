CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE shop (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location geometry(Point,4326) NOT NULL
);

CREATE INDEX idx_shop_location
ON shop USING GIST (location);

INSERT INTO shop (name, location)
VALUES
('Demo Shop A', ST_SetSRID(ST_MakePoint(77.5946, 12.9716),4326)),
('Demo Shop B', ST_SetSRID(ST_MakePoint(77.6, 12.975),4326));