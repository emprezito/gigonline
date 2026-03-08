
-- Fix 1: Lessons RLS - require enrollment or admin
DROP POLICY IF EXISTS "Lessons viewable with module" ON public.lessons;
CREATE POLICY "Lessons viewable by enrolled users" ON public.lessons FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE m.id = lessons.module_id
      AND e.user_id = auth.uid()
  )
);

-- Fix 2: Modules RLS - require enrollment or admin
DROP POLICY IF EXISTS "Modules viewable with course" ON public.modules;
CREATE POLICY "Modules viewable by enrolled users" ON public.modules FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE c.id = modules.course_id
      AND e.user_id = auth.uid()
  )
);

-- Fix 3: Affiliate self-approval prevention - replace broad UPDATE with trigger guard
CREATE OR REPLACE FUNCTION public.prevent_affiliate_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is not an admin, prevent changes to sensitive columns
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.approved := OLD.approved;
    NEW.enabled := OLD.enabled;
    NEW.commission_rate := OLD.commission_rate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_affiliate_self_approval_trigger ON public.affiliates;
CREATE TRIGGER prevent_affiliate_self_approval_trigger
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_affiliate_self_approval();
