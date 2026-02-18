-- ============================================================
-- STOK OPNAME – Database Schema
-- ============================================================

-- 1. opname_sessions – the main session record
CREATE TABLE public.opname_sessions (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_type          TEXT NOT NULL CHECK (session_type IN ('opening','closing','adhoc')),
  session_status        TEXT NOT NULL DEFAULT 'draft' CHECK (session_status IN ('draft','completed','approved','locked')),
  notes                 TEXT,
  total_expected        INTEGER NOT NULL DEFAULT 0,
  total_scanned         INTEGER NOT NULL DEFAULT 0,
  total_match           INTEGER NOT NULL DEFAULT 0,
  total_missing         INTEGER NOT NULL DEFAULT 0,
  total_unregistered    INTEGER NOT NULL DEFAULT 0,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at          TIMESTAMP WITH TIME ZONE,
  approved_at           TIMESTAMP WITH TIME ZONE,
  locked_at             TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. opname_snapshot_items – frozen list of units expected at session start
CREATE TABLE public.opname_snapshot_items (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES public.opname_sessions(id) ON DELETE CASCADE,
  unit_id       UUID NOT NULL REFERENCES public.stock_units(id) ON DELETE CASCADE,
  imei          TEXT NOT NULL,
  product_label TEXT NOT NULL,  -- e.g. "iPhone 11 64GB – Black (Resmi BC)"
  selling_price NUMERIC,
  cost_price    NUMERIC,
  stock_status  TEXT NOT NULL,
  scan_result   TEXT DEFAULT 'missing' CHECK (scan_result IN ('match','missing')),
  action_taken  TEXT CHECK (action_taken IN ('sold_pos','sold_ecommerce','sold_manual','service','lost','pending_investigation',NULL)),
  action_notes  TEXT,
  sold_reference_id TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. opname_scanned_items – live list of IMEI scanned by operator
CREATE TABLE public.opname_scanned_items (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES public.opname_sessions(id) ON DELETE CASCADE,
  imei          TEXT NOT NULL,
  scan_result   TEXT NOT NULL CHECK (scan_result IN ('match','unregistered')),
  action_taken  TEXT CHECK (action_taken IN ('add_to_stock','mark_return','ignore',NULL)),
  action_notes  TEXT,
  scanned_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (session_id, imei)
);

-- 4. Timestamps trigger
CREATE OR REPLACE FUNCTION public.update_opname_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_opname_sessions_updated_at
  BEFORE UPDATE ON public.opname_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_opname_session_updated_at();

-- 5. Row Level Security
ALTER TABLE public.opname_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opname_snapshot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opname_scanned_items ENABLE ROW LEVEL SECURITY;

-- opname_sessions policies
CREATE POLICY "authenticated_read_opname_sessions"
  ON public.opname_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_opname_sessions"
  ON public.opname_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_update_opname_sessions"
  ON public.opname_sessions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- opname_snapshot_items policies
CREATE POLICY "authenticated_read_snapshot_items"
  ON public.opname_snapshot_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_snapshot_items"
  ON public.opname_snapshot_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_update_snapshot_items"
  ON public.opname_snapshot_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- opname_scanned_items policies
CREATE POLICY "authenticated_read_scanned_items"
  ON public.opname_scanned_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_scanned_items"
  ON public.opname_scanned_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_update_scanned_items"
  ON public.opname_scanned_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Super admin only: delete scanned items (undo scan)
CREATE POLICY "authenticated_delete_scanned_items"
  ON public.opname_scanned_items FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 6. Indexes
CREATE INDEX idx_opname_sessions_status ON public.opname_sessions(session_status);
CREATE INDEX idx_opname_sessions_started_at ON public.opname_sessions(started_at DESC);
CREATE INDEX idx_opname_snapshot_session ON public.opname_snapshot_items(session_id);
CREATE INDEX idx_opname_snapshot_unit ON public.opname_snapshot_items(unit_id);
CREATE INDEX idx_opname_scanned_session ON public.opname_scanned_items(session_id);
CREATE INDEX idx_opname_scanned_imei ON public.opname_scanned_items(imei);
