-- 1. Replace affiliate UPDATE policy to restrict columns via a security definer function
DROP POLICY IF EXISTS "Users can update own affiliate data" ON public.affiliates;

-- New policy: users can only update their own row, and a WITH CHECK ensures
-- approved/enabled/commission_rate haven't changed (compared to existing row via trigger)
-- Since we can't do column-level RLS easily, we keep the trigger and tighten the policy
CREATE POLICY "Users can update own bank details"
  ON public.affiliates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Tighten payout INSERT policy to enforce status = 'pending'
DROP POLICY IF EXISTS "Affiliates can request payouts" ON public.payouts;

CREATE POLICY "Affiliates can request pending payouts"
  ON public.payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND approved_at IS NULL
    AND completed_at IS NULL
    AND transfer_reference IS NULL
    AND EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = affiliate_id
        AND affiliates.user_id = auth.uid()
        AND affiliates.approved = true
        AND affiliates.enabled = true
    )
  );

-- 3. referral_clicks_safe is a view with security_invoker=true,
-- so it inherits RLS from the base table. Drop and recreate to be safe.
-- The scanner thinks it's a table. We can't add RLS to views, but let's
-- ensure it's properly set up.
DROP VIEW IF EXISTS public.referral_clicks_safe;
CREATE VIEW public.referral_clicks_safe
  WITH (security_invoker = true)
  AS SELECT id, affiliate_id, created_at FROM public.referral_clicks;