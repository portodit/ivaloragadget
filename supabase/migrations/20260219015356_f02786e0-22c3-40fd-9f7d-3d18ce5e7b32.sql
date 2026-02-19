-- Add customer role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- Create bonus_products master table for reusable bonus items
CREATE TABLE public.bonus_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_bonus_products"
  ON public.bonus_products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "superadmin_manage_bonus_products"
  ON public.bonus_products FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Public can read bonus products (needed for shop page)
CREATE POLICY "public_read_bonus_products"
  ON public.bonus_products FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_bonus_products_updated_at
  BEFORE UPDATE ON public.bonus_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed common bonus items
INSERT INTO public.bonus_products (name, description, sort_order) VALUES
  ('Extra Bubble Wrap', 'Perlindungan ekstra saat pengiriman', 1),
  ('Garansi Unit 30 Hari', 'Garansi mesin 30 hari dari toko', 2),
  ('Adaptor UGREEN 20W', 'Charger kepala 20W kualitas premium', 3),
  ('Asuransi Pengiriman', 'Perlindungan kerusakan saat pengiriman', 4),
  ('Tempered Glass', 'Pelindung layar anti gores', 5),
  ('Softcase', 'Casing silikon pelindung body', 6),
  ('Sinyal Permanen', 'Garansi sinyal kartu SIM berfungsi normal', 7),
  ('Kabel Data', 'Kabel data original compatible', 8);

-- Add resend_email_cooldown tracking to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_resend_at timestamp with time zone;
