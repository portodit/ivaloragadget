
-- Add product specification fields to catalog_products
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS spec_condition TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spec_brand TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spec_warranty_duration TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spec_screen_protector_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spec_case_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spec_custom_product TEXT DEFAULT 'Tidak',
  ADD COLUMN IF NOT EXISTS spec_built_in_battery TEXT DEFAULT 'Ya',
  ADD COLUMN IF NOT EXISTS spec_condition_detail TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spec_cable_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spec_phone_model TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spec_postel_cert TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS spec_shipped_from TEXT DEFAULT 'Kota Surabaya',
  ADD COLUMN IF NOT EXISTS rating_score NUMERIC(3,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
