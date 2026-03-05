CREATE POLICY "Users can update own affiliate data"
ON public.affiliates FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);