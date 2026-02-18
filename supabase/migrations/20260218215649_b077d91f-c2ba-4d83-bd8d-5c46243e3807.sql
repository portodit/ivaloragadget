
-- ══════════════════════════════════════════════════════════════════════
-- Stok IMEI (stock_units) – Schema Migration
-- ══════════════════════════════════════════════════════════════════════

-- 1. Enums
CREATE TYPE public.stock_status AS ENUM (
  'available',
  'reserved',
  'coming_soon',
  'service',
  'sold',
  'return',
  'lost'
);

CREATE TYPE public.condition_status AS ENUM (
  'no_minus',
  'minus'
);

CREATE TYPE public.sold_channel AS ENUM (
  'pos',
  'ecommerce',
  'manual'
);

-- 2. Main table
CREATE TABLE public.stock_units (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid NOT NULL REFERENCES public.master_products(id),
  imei                  varchar(20) UNIQUE NOT NULL,
  condition_status      condition_status NOT NULL DEFAULT 'no_minus',
  minus_description     text,
  selling_price         numeric(15,2),
  cost_price            numeric(15,2),
  stock_status          stock_status NOT NULL DEFAULT 'available',
  sold_channel          sold_channel,
  sold_reference_id     varchar(100),
  reserved_at           timestamptz,
  sold_at               timestamptz,
  status_changed_at     timestamptz NOT NULL DEFAULT now(),
  received_at           timestamptz NOT NULL DEFAULT now(),
  supplier              varchar(100),
  batch_code            varchar(50),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX idx_stock_units_product_id   ON public.stock_units (product_id);
CREATE INDEX idx_stock_units_stock_status ON public.stock_units (stock_status);
CREATE INDEX idx_stock_units_imei         ON public.stock_units (imei);
CREATE INDEX idx_stock_units_received_at  ON public.stock_units (received_at DESC);

-- 4. Trigger: auto-update updated_at
CREATE TRIGGER set_stock_units_updated_at
  BEFORE UPDATE ON public.stock_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Audit log table
CREATE TABLE public.stock_unit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id        uuid NOT NULL REFERENCES public.stock_units(id) ON DELETE CASCADE,
  changed_by     uuid,  -- auth.uid() at time of change
  changed_at     timestamptz NOT NULL DEFAULT now(),
  field_changed  varchar(50) NOT NULL,
  old_value      text,
  new_value      text,
  reason         text
);

CREATE INDEX idx_stock_unit_logs_unit_id ON public.stock_unit_logs (unit_id);
CREATE INDEX idx_stock_unit_logs_changed_at ON public.stock_unit_logs (changed_at DESC);

-- 6. Trigger: auto-log status changes
CREATE OR REPLACE FUNCTION public.log_stock_unit_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.stock_status IS DISTINCT FROM NEW.stock_status THEN
    INSERT INTO public.stock_unit_logs (unit_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'stock_status', OLD.stock_status::text, NEW.stock_status::text);
    NEW.status_changed_at = now();
  END IF;
  IF OLD.selling_price IS DISTINCT FROM NEW.selling_price THEN
    INSERT INTO public.stock_unit_logs (unit_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'selling_price', OLD.selling_price::text, NEW.selling_price::text);
  END IF;
  IF OLD.condition_status IS DISTINCT FROM NEW.condition_status THEN
    INSERT INTO public.stock_unit_logs (unit_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'condition_status', OLD.condition_status::text, NEW.condition_status::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_stock_unit_audit
  BEFORE UPDATE ON public.stock_units
  FOR EACH ROW EXECUTE FUNCTION public.log_stock_unit_status_change();

-- 7. RLS
ALTER TABLE public.stock_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_unit_logs ENABLE ROW LEVEL SECURITY;

-- stock_units: all authenticated users can read
CREATE POLICY "authenticated_read_stock_units"
  ON public.stock_units FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- stock_units: only super_admin can insert
CREATE POLICY "superadmin_insert_stock_units"
  ON public.stock_units FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- stock_units: only super_admin can update
CREATE POLICY "superadmin_update_stock_units"
  ON public.stock_units FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- No DELETE (soft status change instead)

-- stock_unit_logs: authenticated read
CREATE POLICY "authenticated_read_logs"
  ON public.stock_unit_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- stock_unit_logs: system insert (via trigger — needs service role or superadmin)
CREATE POLICY "superadmin_insert_logs"
  ON public.stock_unit_logs FOR INSERT
  WITH CHECK (true);
