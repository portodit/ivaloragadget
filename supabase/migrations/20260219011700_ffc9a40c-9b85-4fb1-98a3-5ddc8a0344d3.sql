
-- Add new fields to catalog_products for enhanced catalog management
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS tokopedia_url text NULL,
  ADD COLUMN IF NOT EXISTS shopee_url text NULL,
  ADD COLUMN IF NOT EXISTS bonus_items jsonb NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_badge text NULL;

-- Ensure slug is editable and has unique constraint if not already
CREATE UNIQUE INDEX IF NOT EXISTS catalog_products_slug_unique 
  ON public.catalog_products (slug) 
  WHERE slug IS NOT NULL;

-- Add a function to auto-generate slug from display_name + product_id if not set
CREATE OR REPLACE FUNCTION public.generate_catalog_slug(display_name text, product_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  suffix text;
  counter int := 0;
BEGIN
  -- Convert display_name to lowercase slug
  base_slug := lower(regexp_replace(
    regexp_replace(display_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  
  -- Add short unique suffix from product_id
  suffix := substring(replace(product_id::text, '-', ''), 1, 6);
  final_slug := base_slug || '-' || suffix;
  
  RETURN final_slug;
END;
$$;
