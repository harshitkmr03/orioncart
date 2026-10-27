-- ============================================================
--  V22 – PostGIS Spatial Indexing for Shop Discovery
-- ============================================================

-- 1. Ensure PostGIS extension is installed
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add location geography column (WGS 84, SRID 4326) to shop table
ALTER TABLE shop
    ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);

-- 3. Populate existing rows with coordinates into location
UPDATE shop
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

-- 4. Create GiST spatial index on shop.location for ultra-fast spatial search
CREATE INDEX IF NOT EXISTS idx_shop_location_gist
    ON shop USING GIST (location);

-- 5. Trigger function to synchronize location whenever latitude/longitude changes
CREATE OR REPLACE FUNCTION trg_fn_sync_shop_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    ELSE
        NEW.location := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shop_location_sync ON shop;
CREATE TRIGGER trg_shop_location_sync
BEFORE INSERT OR UPDATE OF latitude, longitude ON shop
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sync_shop_location();
