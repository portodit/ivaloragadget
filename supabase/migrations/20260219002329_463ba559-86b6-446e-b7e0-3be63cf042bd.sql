-- ── Discount & Promo Code System ─────────────────────────────────────────────

CREATE TYPE public.discount_type AS ENUM (
  'percentage',        -- e.g. 10%
  'fixed_amount',      -- e.g. Rp 500.000
  'buy_x_get_y',       -- Buy X get Y free
  'min_purchase',      -- Discount if min purchase met
  'flash_sale'         -- Limited time, limited qty
);

CREATE TABLE public.discount_codes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                varchar(50) NOT NULL UNIQUE,
  name                text NOT NULL,
  description         text,
  discount_type       public.discount_type NOT NULL DEFAULT 'percentage',
  -- For percentage: 0-100
  discount_percent    numeric(5,2),
  -- For fixed_amount / flash_sale
  discount_amount     numeric(12,2),
  -- Min purchase required (for min_purchase type or general min)
  min_purchase_amount numeric(12,2),
  -- Buy X get Y
  buy_quantity        integer,
  get_quantity        integer,
  -- Usage limits
  max_uses            integer,           -- NULL = unlimited
  used_count          integer NOT NULL DEFAULT 0,
  -- Per-user limit
  max_uses_per_user   integer DEFAULT 1,
  -- Validity
  valid_from          timestamptz NOT NULL DEFAULT now(),
  valid_until         timestamptz,       -- NULL = no expiry
  -- Applicability
  applies_to_all      boolean NOT NULL DEFAULT true,
  -- JSON array of catalog_product ids this applies to (if not all)
  applicable_product_ids jsonb,
  -- Status
  is_active           boolean NOT NULL DEFAULT true,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Link catalog products to discount codes (many-to-many, optional)
CREATE TABLE public.catalog_discount_codes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_product_id  uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  discount_code_id    uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(catalog_product_id, discount_code_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_discount_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_discount_updated_at();

-- RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_discount_codes ENABLE ROW LEVEL SECURITY;

-- discount_codes
CREATE POLICY "authenticated_read_discounts"
  ON public.discount_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "superadmin_insert_discounts"
  ON public.discount_codes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "superadmin_update_discounts"
  ON public.discount_codes FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "superadmin_delete_discounts"
  ON public.discount_codes FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- catalog_discount_codes
CREATE POLICY "authenticated_read_catalog_discounts"
  ON public.catalog_discount_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "superadmin_manage_catalog_discounts"
  ON public.catalog_discount_codes FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));