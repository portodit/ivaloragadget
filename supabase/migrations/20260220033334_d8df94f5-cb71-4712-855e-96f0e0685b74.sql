
-- Migration 1: Add new enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_branch';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
