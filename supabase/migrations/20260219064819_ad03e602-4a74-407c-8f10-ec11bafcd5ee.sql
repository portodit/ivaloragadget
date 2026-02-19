
-- Add flash sale discount columns to catalog_products
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS flash_sale_discount_type text DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS flash_sale_discount_value numeric DEFAULT NULL;

-- Add bulk default discount settings to flash_sale_settings
ALTER TABLE public.flash_sale_settings
  ADD COLUMN IF NOT EXISTS default_discount_type text DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS default_discount_value numeric DEFAULT 0;
