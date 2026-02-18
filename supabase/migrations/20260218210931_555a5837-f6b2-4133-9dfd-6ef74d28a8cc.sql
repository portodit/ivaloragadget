
-- Create enums
CREATE TYPE public.product_category AS ENUM ('iphone', 'ipad', 'accessory');
CREATE TYPE public.warranty_type AS ENUM ('resmi_bc', 'ibox', 'inter', 'whitelist', 'digimap');

-- Create master_products table
CREATE TABLE public.master_products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    product_category NOT NULL,
  series      varchar(100) NOT NULL,
  storage_gb  integer NOT NULL,
  color       varchar(50) NOT NULL,
  warranty_type warranty_type NOT NULL,
  base_price  numeric(15,2),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,

  -- Unique constraint: no duplicate SKU combinations
  CONSTRAINT uq_master_products_sku UNIQUE (category, series, storage_gb, color, warranty_type)
);

-- Enable RLS
ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;

-- Policies: admins and super_admins can read all active records
CREATE POLICY "authenticated_read_active_products"
  ON public.master_products
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super_admin can insert
CREATE POLICY "superadmin_insert_products"
  ON public.master_products
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can update
CREATE POLICY "superadmin_update_products"
  ON public.master_products
  FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can delete (soft delete via updated_at trigger still applies)
CREATE POLICY "superadmin_delete_products"
  ON public.master_products
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger: auto-update updated_at
CREATE TRIGGER set_master_products_updated_at
  BEFORE UPDATE ON public.master_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
