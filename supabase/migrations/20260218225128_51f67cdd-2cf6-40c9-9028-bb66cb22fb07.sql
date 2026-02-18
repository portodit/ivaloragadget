-- ── Opname session assignments (super admin assigns admins to sessions) ──────

CREATE TABLE public.opname_session_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.opname_sessions(id) ON DELETE CASCADE,
  admin_id     uuid NOT NULL,           -- references user_profiles.id
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  uuid,                    -- super admin who assigned
  UNIQUE (session_id, admin_id)
);

ALTER TABLE public.opname_session_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "super_admin_all_assignments"
  ON public.opname_session_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Admins can read their own assignments
CREATE POLICY "admin_read_own_assignments"
  ON public.opname_session_assignments
  FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

-- ── Opname schedule config (super admin sets recurring schedule) ──────────────

CREATE TABLE public.opname_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_type  text NOT NULL CHECK (schedule_type IN ('opening', 'closing', 'adhoc')),
  is_active    boolean NOT NULL DEFAULT true,
  cron_time    text NOT NULL,            -- e.g. '08:00' for 08:00 WIB
  notes        text,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opname_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_schedules"
  ON public.opname_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- All authenticated users can read schedules (for awareness)
CREATE POLICY "authenticated_read_schedules"
  ON public.opname_schedules
  FOR SELECT
  TO authenticated
  USING (true);

-- Update trigger for schedules
CREATE OR REPLACE FUNCTION public.update_opname_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_opname_schedules_updated_at
  BEFORE UPDATE ON public.opname_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_opname_schedules_updated_at();

-- ── RLS for opname_sessions: admins see only their assigned sessions ──────────
-- (Super admins already have full access via existing policies)

-- Allow assigned admins to view their sessions
CREATE POLICY "assigned_admin_view_sessions"
  ON public.opname_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.opname_session_assignments
      WHERE session_id = id AND admin_id = auth.uid()
    )
  );

-- Allow assigned admins to update sessions (complete them)
CREATE POLICY "assigned_admin_update_sessions"
  ON public.opname_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.opname_session_assignments
      WHERE session_id = id AND admin_id = auth.uid()
    )
  );

-- Allow assigned admins to insert/update scanned items on their sessions
CREATE POLICY "assigned_admin_manage_scanned"
  ON public.opname_scanned_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.opname_session_assignments
      WHERE session_id = opname_scanned_items.session_id AND admin_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.opname_session_assignments
      WHERE session_id = opname_scanned_items.session_id AND admin_id = auth.uid()
    )
  );
