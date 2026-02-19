-- Add unique constraint on IMEI for active (non-deleted) stock units
-- We use a unique index that only applies to non-deleted records
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_units_imei_unique 
ON public.stock_units (imei);
