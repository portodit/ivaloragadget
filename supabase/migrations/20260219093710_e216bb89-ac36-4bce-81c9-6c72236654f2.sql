
-- Step 1: Add new enum values
ALTER TYPE public.sold_channel ADD VALUE IF NOT EXISTS 'ecommerce_tokopedia';
ALTER TYPE public.sold_channel ADD VALUE IF NOT EXISTS 'ecommerce_shopee';
