-- Fix: drop the security definer view and recreate with security_invoker
DROP VIEW IF EXISTS public.referral_clicks_safe;
CREATE VIEW public.referral_clicks_safe
  WITH (security_invoker = true)
  AS SELECT id, affiliate_id, created_at FROM public.referral_clicks;