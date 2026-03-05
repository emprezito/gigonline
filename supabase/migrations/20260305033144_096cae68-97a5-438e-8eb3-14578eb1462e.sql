CREATE POLICY "Users can enroll themselves"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);