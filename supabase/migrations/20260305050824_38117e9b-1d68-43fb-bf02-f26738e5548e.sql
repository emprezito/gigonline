CREATE POLICY "Anyone can look up affiliates by referral code"
ON public.affiliates FOR SELECT
TO anon, authenticated
USING (enabled = true);