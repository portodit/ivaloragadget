
-- Allow public (unauthenticated) users to read published catalog products
CREATE POLICY "public_read_published_catalog"
ON public.catalog_products
FOR SELECT
USING (catalog_status = 'published' AND publish_to_web = true);

-- Allow public read on stock_units for price display (only available units, limited columns via app)
CREATE POLICY "public_read_available_stock"
ON public.stock_units
FOR SELECT
USING (stock_status = 'available');

-- Allow public read on master_products for catalog display
CREATE POLICY "public_read_active_products"
ON public.master_products
FOR SELECT
USING (is_active = true AND deleted_at IS NULL);
