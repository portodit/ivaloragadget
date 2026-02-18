
-- ── 1. Fix SELECT RLS: add deleted_at IS NULL filter ──────────────────────
DROP POLICY IF EXISTS "authenticated_read_active_products" ON public.master_products;

CREATE POLICY "authenticated_read_products"
  ON public.master_products
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );

-- ── 2. Remove DELETE policy (soft delete only) ────────────────────────────
DROP POLICY IF EXISTS "superadmin_delete_products" ON public.master_products;

-- ── 3. Drop old hard UNIQUE constraint, add partial unique index ──────────
ALTER TABLE public.master_products
  DROP CONSTRAINT IF EXISTS uq_master_products_sku;

CREATE UNIQUE INDEX IF NOT EXISTS uq_master_products_sku_active
  ON public.master_products (category, series, storage_gb, color, warranty_type)
  WHERE deleted_at IS NULL;

-- ── 4. Performance indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_master_products_active
  ON public.master_products (is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_master_products_category
  ON public.master_products (category);

CREATE INDEX IF NOT EXISTS idx_master_products_series
  ON public.master_products (series);

-- ── 5. Warranty labels table (dynamic warranty types) ─────────────────────
CREATE TABLE IF NOT EXISTS public.warranty_labels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         varchar(60) NOT NULL UNIQUE,
  label       text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed with existing enum-based labels
INSERT INTO public.warranty_labels (key, label, description, sort_order) VALUES
  ('resmi_bc',  'Resmi BC (Bea Cukai)',        'Garansi resmi dengan bukti bea cukai Indonesia',  1),
  ('ibox',      'Resmi iBox Indonesia',         'Garansi resmi distributor iBox Indonesia',         2),
  ('inter',     'Inter (Internasional)',         'Garansi internasional, tidak resmi Indonesia',    3),
  ('whitelist', 'Whitelist Terdaftar',           'Unit terdaftar whitelist Kominfo',                4),
  ('digimap',   'Resmi Digimap Indonesia',       'Garansi resmi distributor Digimap Indonesia',     5)
ON CONFLICT (key) DO NOTHING;

-- RLS for warranty_labels
ALTER TABLE public.warranty_labels ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active labels
CREATE POLICY "authenticated_read_warranty_labels"
  ON public.warranty_labels
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super_admin can insert
CREATE POLICY "superadmin_insert_warranty_labels"
  ON public.warranty_labels
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can update
CREATE POLICY "superadmin_update_warranty_labels"
  ON public.warranty_labels
  FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- updated_at trigger for warranty_labels
CREATE TRIGGER set_warranty_labels_updated_at
  BEFORE UPDATE ON public.warranty_labels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
