
DROP POLICY "Users can update own bank details" ON public.affiliates;

CREATE POLICY "Users can update own bank details"
ON public.affiliates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (approved = (SELECT a.approved FROM public.affiliates a WHERE a.id = affiliates.id))
  AND (enabled = (SELECT a.enabled FROM public.affiliates a WHERE a.id = affiliates.id))
  AND (NOT (commission_rate IS DISTINCT FROM (SELECT a.commission_rate FROM public.affiliates a WHERE a.id = affiliates.id)))
  AND (NOT (transfer_recipient_code IS DISTINCT FROM (SELECT a.transfer_recipient_code FROM public.affiliates a WHERE a.id = affiliates.id)))
  AND (referral_code = (SELECT a.referral_code FROM public.affiliates a WHERE a.id = affiliates.id))
);
