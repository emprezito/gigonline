-- 1. Fix affiliate INSERT policy to enforce safe defaults
DROP POLICY IF EXISTS "Users can insert own affiliate" ON public.affiliates;

CREATE POLICY "Users can insert own affiliate"
  ON public.affiliates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND approved = false
    AND commission_rate IS NULL
  );

-- 2. Fix lesson_progress INSERT to require enrollment
DROP POLICY IF EXISTS "Users can manage own progress" ON public.lesson_progress;

CREATE POLICY "Users can manage own progress"
  ON public.lesson_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.enrollments e ON e.course_id = m.course_id
      WHERE l.id = lesson_id AND e.user_id = auth.uid()
    )
  );