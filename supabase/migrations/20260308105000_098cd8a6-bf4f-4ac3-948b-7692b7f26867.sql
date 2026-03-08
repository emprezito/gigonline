
-- 1. Create a safe version that only checks the CALLING user's roles
CREATE OR REPLACE FUNCTION public.has_own_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- 2. Revoke public execute on the original has_role (prevents enumeration)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;

-- 3. Update all RLS policies to use has_own_role() instead of has_role(auth.uid(), ...)

-- affiliates
DROP POLICY IF EXISTS "Admins can manage affiliates" ON public.affiliates;
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all affiliates" ON public.affiliates;
CREATE POLICY "Admins can view all affiliates" ON public.affiliates FOR SELECT
USING (has_own_role('admin'::app_role));

-- courses
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON public.courses;
CREATE POLICY "Published courses are viewable by everyone" ON public.courses FOR SELECT
USING (published = true OR has_own_role('admin'::app_role));

-- enrollments
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT
USING (has_own_role('admin'::app_role));

-- lessons
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Lessons viewable by enrolled users" ON public.lessons;
CREATE POLICY "Lessons viewable by enrolled users" ON public.lessons FOR SELECT
USING (
  has_own_role('admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM modules m
    JOIN courses c ON c.id = m.course_id
    JOIN enrollments e ON e.course_id = c.id
    WHERE m.id = lessons.module_id AND e.user_id = auth.uid()
  )
);

-- modules
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Modules viewable by enrolled users" ON public.modules;
CREATE POLICY "Modules viewable by enrolled users" ON public.modules FOR SELECT
USING (
  has_own_role('admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM courses c
    JOIN enrollments e ON e.course_id = c.id
    WHERE c.id = modules.course_id AND e.user_id = auth.uid()
  )
);

-- payouts
DROP POLICY IF EXISTS "Admins can manage payouts" ON public.payouts;
CREATE POLICY "Admins can manage payouts" ON public.payouts FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;
CREATE POLICY "Admins can view all payouts" ON public.payouts FOR SELECT
USING (has_own_role('admin'::app_role));

-- platform_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.platform_settings;
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can read all settings" ON public.platform_settings;
CREATE POLICY "Admins can read all settings" ON public.platform_settings FOR SELECT
USING (has_own_role('admin'::app_role));

-- push_subscriptions
DROP POLICY IF EXISTS "Service role can manage all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role can manage all push subscriptions" ON public.push_subscriptions FOR ALL
USING (has_own_role('admin'::app_role));

-- referral_clicks
DROP POLICY IF EXISTS "Admins can view all clicks" ON public.referral_clicks;
CREATE POLICY "Admins can view all clicks" ON public.referral_clicks FOR SELECT
USING (has_own_role('admin'::app_role));

-- sales
DROP POLICY IF EXISTS "Admins can manage sales" ON public.sales;
CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;
CREATE POLICY "Admins can view all sales" ON public.sales FOR SELECT
USING (has_own_role('admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT
USING (has_own_role('admin'::app_role));

-- Update triggers to use has_role internally (they run as SECURITY DEFINER so they can still call it)
-- No change needed since triggers use SECURITY DEFINER and the function owner still has EXECUTE
