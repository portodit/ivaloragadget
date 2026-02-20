
-- Add days_of_week column to opname_schedules (0=Sunday, 1=Monday, ..., 6=Saturday)
ALTER TABLE public.opname_schedules
  ADD COLUMN IF NOT EXISTS days_of_week integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}';

-- Add admin_branch RLS policies for opname_schedules (manage their own branch)
CREATE POLICY "admin_branch_insert_schedules"
  ON public.opname_schedules
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin_branch'::app_role)
    AND branch_id IN (SELECT get_user_branch_ids(auth.uid()))
  );

CREATE POLICY "admin_branch_update_schedules"
  ON public.opname_schedules
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin_branch'::app_role)
    AND branch_id IN (SELECT get_user_branch_ids(auth.uid()))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_branch'::app_role)
    AND branch_id IN (SELECT get_user_branch_ids(auth.uid()))
  );

CREATE POLICY "admin_branch_delete_schedules"
  ON public.opname_schedules
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin_branch'::app_role)
    AND branch_id IN (SELECT get_user_branch_ids(auth.uid()))
  );

-- Also add admin_branch INSERT policy for opname_session_assignments 
-- (so admin_branch can assign employees to sessions they create)
CREATE POLICY "admin_branch_manage_assignments"
  ON public.opname_session_assignments
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin_branch'::app_role)
    AND session_id IN (
      SELECT id FROM public.opname_sessions
      WHERE branch_id IN (SELECT get_user_branch_ids(auth.uid()))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_branch'::app_role)
    AND session_id IN (
      SELECT id FROM public.opname_sessions
      WHERE branch_id IN (SELECT get_user_branch_ids(auth.uid()))
    )
  );

-- Employee can read assignments they're part of
CREATE POLICY "employee_read_own_assignments"
  ON public.opname_session_assignments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'employee'::app_role)
    AND admin_id = auth.uid()
  );
