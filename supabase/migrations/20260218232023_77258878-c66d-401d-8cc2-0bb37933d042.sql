-- Allow super_admin to delete opname sessions and related data

-- Policy: super_admin dapat menghapus sesi opname
CREATE POLICY "superadmin_delete_opname_sessions"
ON public.opname_sessions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Policy: super_admin dapat menghapus snapshot items
CREATE POLICY "superadmin_delete_snapshot_items"
ON public.opname_snapshot_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);
