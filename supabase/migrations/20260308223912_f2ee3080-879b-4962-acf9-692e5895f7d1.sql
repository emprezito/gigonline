
-- Drop and recreate the INSERT policy with server-side balance validation
DROP POLICY IF EXISTS "Affiliates can request pending payouts" ON public.payouts;

CREATE POLICY "Affiliates can request pending payouts"
  ON public.payouts
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND approved_at IS NULL
    AND completed_at IS NULL
    AND transfer_reference IS NULL
    AND EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = payouts.affiliate_id
        AND affiliates.user_id = auth.uid()
        AND affiliates.approved = true
        AND affiliates.enabled = true
    )
    AND amount > 0
    AND amount <= (
      COALESCE(
        (SELECT SUM(s.commission_amount) FROM public.sales s
         WHERE s.affiliate_id = payouts.affiliate_id AND s.status = 'completed'),
        0
      )
      -
      COALESCE(
        (SELECT SUM(p.amount) FROM public.payouts p
         WHERE p.affiliate_id = payouts.affiliate_id AND p.status IN ('pending', 'processing', 'completed')),
        0
      )
    )
  );
