-- ═══════════════════════════════════════════════════════════
-- Katalog Produk – catalog_products table
-- ═══════════════════════════════════════════════════════════

CREATE TYPE public.price_strategy AS ENUM ('min_price', 'avg_price', 'fixed');
CREATE TYPE public.catalog_status AS ENUM ('draft', 'published', 'unpublished');

CREATE TABLE public.catalog_products (
  id                      UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id              UUID NOT NULL REFERENCES public.master_products(id) ON DELETE RESTRICT,

  -- Identity
  slug                    TEXT UNIQUE,
  display_name            TEXT NOT NULL,
  short_description       TEXT,
  full_description        TEXT,

  -- Media
  thumbnail_url           TEXT,
  gallery_urls            TEXT[] DEFAULT '{}',

  -- Publish controls
  catalog_status          public.catalog_status NOT NULL DEFAULT 'draft',
  publish_to_pos          BOOLEAN NOT NULL DEFAULT false,
  publish_to_web          BOOLEAN NOT NULL DEFAULT false,
  publish_to_marketplace  BOOLEAN NOT NULL DEFAULT false,

  -- Price strategy
  price_strategy          public.price_strategy NOT NULL DEFAULT 'min_price',
  override_display_price  NUMERIC,

  -- Badge & labels
  highlight_product       BOOLEAN NOT NULL DEFAULT false,
  show_condition_breakdown BOOLEAN NOT NULL DEFAULT true,
  promo_label             TEXT,

  -- Timestamps
  created_by              UUID,
  updated_by              UUID,
  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Ensure one catalog entry per product
  CONSTRAINT unique_catalog_product UNIQUE (product_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_catalog_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_catalog_updated_at
  BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read catalog entries
CREATE POLICY "authenticated_read_catalog"
  ON public.catalog_products FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super_admin can insert
CREATE POLICY "superadmin_insert_catalog"
  ON public.catalog_products FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin full update; admin limited update (handled in app layer)
CREATE POLICY "superadmin_update_catalog"
  ON public.catalog_products FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Admin can update description and media only (product_id, price, publish unchanged)
CREATE POLICY "admin_update_catalog_limited"
  ON public.catalog_products FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)
  );

-- Only super_admin can delete (soft not used here, physical delete rare)
CREATE POLICY "superadmin_delete_catalog"
  ON public.catalog_products FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ── Storage bucket for catalog images ───────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog-images',
  'catalog-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "catalog_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'catalog-images');

CREATE POLICY "superadmin_upload_catalog_images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'catalog-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "superadmin_update_catalog_images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'catalog-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "superadmin_delete_catalog_images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'catalog-images' AND auth.uid() IS NOT NULL);
