-- Add scanned_by column to track which user performed each scan
ALTER TABLE public.opname_scanned_items
ADD COLUMN IF NOT EXISTS scanned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_opname_scanned_items_scanned_by ON public.opname_scanned_items(scanned_by);
