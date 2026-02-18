-- Enable the custom email hook so Supabase Auth uses our branded email function
-- This registers the send_email hook pointing to our Edge Function
CREATE OR REPLACE FUNCTION public.custom_email_hook(event jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a placeholder; the actual hook is configured via config.toml
  -- Supabase will call the edge function directly
  RETURN;
END;
$$;

-- Grant necessary permissions for the hook
GRANT EXECUTE ON FUNCTION public.custom_email_hook TO supabase_auth_admin;
