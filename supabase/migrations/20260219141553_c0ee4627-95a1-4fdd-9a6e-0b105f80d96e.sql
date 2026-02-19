
-- Step 1: Add grouping columns and backfill
ALTER TABLE catalog_products 
  ADD COLUMN IF NOT EXISTS catalog_series text,
  ADD COLUMN IF NOT EXISTS catalog_warranty_type text;

-- Backfill from existing linked master_products
UPDATE catalog_products cp
SET catalog_series = mp.series,
    catalog_warranty_type = mp.warranty_type::text
FROM master_products mp
WHERE cp.product_id = mp.id
  AND cp.catalog_series IS NULL;

-- Make product_id nullable
ALTER TABLE catalog_products ALTER COLUMN product_id DROP NOT NULL;

-- Drop the 1:1 unique constraint on product_id
DROP INDEX IF EXISTS catalog_products_product_id_key;
ALTER TABLE catalog_products DROP CONSTRAINT IF EXISTS catalog_products_product_id_key;
