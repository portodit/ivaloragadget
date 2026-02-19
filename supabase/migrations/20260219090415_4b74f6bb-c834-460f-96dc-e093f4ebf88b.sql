
-- 1. Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_suppliers" ON public.suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public_read_suppliers" ON public.suppliers
  FOR SELECT USING (true);

CREATE POLICY "superadmin_manage_suppliers" ON public.suppliers
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Add minus severity enum & column
CREATE TYPE public.minus_severity AS ENUM ('minor', 'mayor');

ALTER TABLE public.stock_units
  ADD COLUMN minus_severity public.minus_severity DEFAULT NULL;

-- 3. Add estimated arrival date for coming_soon units
ALTER TABLE public.stock_units
  ADD COLUMN estimated_arrival_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 4. Add website to sold_channel enum
ALTER TYPE public.sold_channel ADD VALUE IF NOT EXISTS 'website';

-- 5. Add supplier_id FK to stock_units
ALTER TABLE public.stock_units
  ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) DEFAULT NULL;

-- 6. Allow super_admin to delete stock units
CREATE POLICY "superadmin_delete_stock_units" ON public.stock_units
  FOR DELETE USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 7. Log minus_severity changes
CREATE OR REPLACE FUNCTION public.log_stock_unit_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.stock_status IS DISTINCT FROM NEW.stock_status THEN
    INSERT INTO public.stock_unit_logs (unit_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'stock_status', OLD.stock_status::text, NEW.stock_status::text);
    NEW.status_changed_at = now();
  END IF;

  IF OLD.selling_price IS DISTINCT FROM NEW.selling_price THEN
    INSERT INTO public.stock_unit_logs (unit_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'selling_price', OLD.selling_price::text, NEW.selling_price::text);
  END IF;

  IF OLD.condition_status IS DISTINCT FROM NEW.condition_status THEN
    INSERT INTO public.stock_unit_logs (unit_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'condition_status', OLD.condition_status::text, NEW.condition_status::text);
  END IF;

  IF OLD.minus_severity IS DISTINCT FROM NEW.minus_severity THEN
    INSERT INTO public.stock_unit_logs (unit_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'minus_severity', OLD.minus_severity::text, NEW.minus_severity::text);
  END IF;

  RETURN NEW;
END;
$function$;
