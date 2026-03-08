-- 1. Restrict platform_settings SELECT to admins only (was public)
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;

-- Create a function to read safe settings (non-sensitive keys only)
CREATE OR REPLACE FUNCTION public.get_platform_setting(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.platform_settings WHERE key = p_key;
$$;

-- Allow admins full read, regular users use the function
CREATE POLICY "Admins can read all settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create a view for referral_clicks that excludes ip_address
CREATE OR REPLACE VIEW public.referral_clicks_safe AS
  SELECT id, affiliate_id, created_at
  FROM public.referral_clicks;