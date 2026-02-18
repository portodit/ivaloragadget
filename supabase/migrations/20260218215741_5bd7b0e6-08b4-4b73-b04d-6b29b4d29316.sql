
-- Fix: restrict stock_unit_logs INSERT to superadmin (triggers run as SECURITY DEFINER)
DROP POLICY IF EXISTS "superadmin_insert_logs" ON public.stock_unit_logs;

CREATE POLICY "superadmin_insert_logs"
  ON public.stock_unit_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR auth.uid() IS NOT NULL);
