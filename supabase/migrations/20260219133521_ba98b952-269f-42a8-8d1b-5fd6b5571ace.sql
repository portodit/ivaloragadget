-- Allow super_admin to delete warranty_labels
CREATE POLICY "superadmin_delete_warranty_labels"
ON public.warranty_labels
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));