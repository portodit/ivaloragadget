
-- Flash sale configuration table (single row settings)
CREATE TABLE public.flash_sale_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_hours INT NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.flash_sale_settings ENABLE ROW LEVEL SECURITY;

-- Public can read (to show/hide flash sale section)
CREATE POLICY "public_read_flash_sale_settings"
ON public.flash_sale_settings
FOR SELECT
USING (true);

-- Only admin/super_admin can modify
CREATE POLICY "admin_manage_flash_sale_settings"
ON public.flash_sale_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Add flash_sale flag to catalog_products
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN NOT NULL DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER set_flash_sale_updated_at
  BEFORE UPDATE ON public.flash_sale_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Insert default row
INSERT INTO public.flash_sale_settings (is_active, start_time, duration_hours) 
VALUES (false, now(), 6);
