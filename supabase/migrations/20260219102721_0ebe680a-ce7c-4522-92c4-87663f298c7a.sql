
-- Add discount fields to catalog_products for per-product discounts
ALTER TABLE public.catalog_products
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_start_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_end_at timestamptz DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.catalog_products.discount_type IS 'percentage or fixed_amount';
COMMENT ON COLUMN public.catalog_products.discount_value IS 'Discount value (percent or rupiah)';
COMMENT ON COLUMN public.catalog_products.discount_active IS 'Whether this product discount is currently active';
COMMENT ON COLUMN public.catalog_products.discount_start_at IS 'Optional start time for timed discount';
COMMENT ON COLUMN public.catalog_products.discount_end_at IS 'Optional end time for timed discount';
