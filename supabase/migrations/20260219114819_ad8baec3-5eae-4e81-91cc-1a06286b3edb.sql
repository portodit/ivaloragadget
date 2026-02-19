-- Fix: Add INSERT policy for catalog-images storage bucket
CREATE POLICY "authenticated_insert_catalog_images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'catalog-images' AND auth.uid() IS NOT NULL);
