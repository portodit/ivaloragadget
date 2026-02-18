
-- ── Tabel notifications (in-app) ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL, -- 'opname_reminder', 'system', 'approval', dll
  title      text NOT NULL,
  body       text,
  link       text,          -- route tujuan klik notif
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User hanya bisa lihat notif milik sendiri
CREATE POLICY "users_select_own_notif"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- User bisa update (mark read) notif milik sendiri
CREATE POLICY "users_update_own_notif"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (edge function) bisa insert notif ke siapa saja
CREATE POLICY "service_insert_notif"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ── Tabel activity_logs (hanya super admin yang baca) ────────────────────────
CREATE TABLE public.activity_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email  text,
  actor_role   text,
  action       text NOT NULL,   -- 'approve_admin', 'suspend_admin', 'role_change', dll
  target_id    uuid,            -- user yg terdampak (jika ada)
  target_email text,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Hanya super admin yang bisa read
CREATE POLICY "superadmin_select_activity_logs"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Siapapun yang authenticated bisa insert (logged via trigger/edge function)
CREATE POLICY "authenticated_insert_activity_logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service role juga bisa insert (edge functions)  
CREATE POLICY "service_insert_activity_logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_activity_logs_actor ON public.activity_logs(actor_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);
