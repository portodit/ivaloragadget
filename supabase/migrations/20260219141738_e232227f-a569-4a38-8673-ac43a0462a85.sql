
-- Add unique constraint on series+warranty_type group
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_unique_series_warranty 
  ON catalog_products(catalog_series, catalog_warranty_type) 
  WHERE catalog_series IS NOT NULL AND catalog_warranty_type IS NOT NULL;
