-- 1. Fix affiliate UPDATE policy with column-value enforcement
DROP POLICY IF EXISTS "Users can update own bank details" ON public.affiliates;

CREATE POLICY "Users can update own bank details"
  ON public.affiliates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND approved = (SELECT a.approved FROM public.affiliates a WHERE a.id = affiliates.id)
    AND enabled = (SELECT a.enabled FROM public.affiliates a WHERE a.id = affiliates.id)
    AND commission_rate IS NOT DISTINCT FROM (SELECT a.commission_rate FROM public.affiliates a WHERE a.id = affiliates.id)
  );

-- 2. Drop the view - affiliates will query referral_clicks directly (RLS already filters)
DROP VIEW IF EXISTS public.referral_clicks_safe;