
-- 1. Add is_public column to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Mark min_withdrawal as public (safe, non-sensitive)
UPDATE public.platform_settings SET is_public = true WHERE key = 'min_withdrawal';

-- 2. Drop and recreate get_platform_setting as SECURITY INVOKER with is_public filter
DROP FUNCTION IF EXISTS public.get_platform_setting(text);

CREATE OR REPLACE FUNCTION public.get_platform_setting(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT value FROM public.platform_settings
  WHERE key = p_key
    AND is_public = true;
$$;

-- 3. Create admin-only function using has_role (not a users table)
CREATE OR REPLACE FUNCTION public.admin_get_platform_setting(p_key text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT value INTO result
  FROM public.platform_settings
  WHERE key = p_key;

  RETURN result;
END;
$$;

-- 4. Fix RLS policies on platform_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.platform_settings;

-- Public read: only is_public = true rows
CREATE POLICY "Authenticated users can read public settings"
ON public.platform_settings AS PERMISSIVE FOR SELECT TO authenticated
USING (is_public = true);

-- Admin full access (already exists from prior migration, recreate to be safe)
CREATE POLICY "Admins can manage all settings"
ON public.platform_settings AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));
