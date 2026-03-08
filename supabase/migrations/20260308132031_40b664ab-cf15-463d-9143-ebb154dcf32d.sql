
-- STEP 1: Drop ALL existing RLS policies on all public tables
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I', 
      pol.policyname, 
      pol.tablename
    );
  END LOOP;
END $$;

-- STEP 2: Recreate all policies AS PERMISSIVE

-- ==================
-- TABLE: profiles
-- ==================
CREATE POLICY "Users can view own or public profiles"
ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
USING ((auth.uid() = id) OR (is_public = true));

CREATE POLICY "Users can insert own profile"
ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- ==================
-- TABLE: user_roles
-- ==================
CREATE POLICY "Users can view own roles"
ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: courses
-- ==================
CREATE POLICY "Published courses viewable by everyone"
ON public.courses AS PERMISSIVE FOR SELECT TO authenticated
USING ((published = true) OR public.has_own_role('admin'::app_role));

CREATE POLICY "Admins can manage courses"
ON public.courses AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: modules
-- ==================
CREATE POLICY "Modules viewable by enrolled users"
ON public.modules AS PERMISSIVE FOR SELECT TO authenticated
USING (
  public.has_own_role('admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE c.id = modules.course_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage modules"
ON public.modules AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: lessons
-- ==================
CREATE POLICY "Lessons viewable by enrolled users"
ON public.lessons AS PERMISSIVE FOR SELECT TO authenticated
USING (
  public.has_own_role('admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE m.id = lessons.module_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage lessons"
ON public.lessons AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: enrollments
-- ==================
CREATE POLICY "Users can view own enrollments"
ON public.enrollments AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage enrollments"
ON public.enrollments AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: lesson_progress
-- ==================
CREATE POLICY "Users can view own progress"
ON public.lesson_progress AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.lesson_progress AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id) AND
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE l.id = lesson_progress.lesson_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own progress"
ON public.lesson_progress AS PERMISSIVE FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==================
-- TABLE: bookmarks
-- ==================
CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
ON public.bookmarks AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks AS PERMISSIVE FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ==================
-- TABLE: affiliates
-- ==================
CREATE POLICY "Users can view own affiliate data"
ON public.affiliates AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliates"
ON public.affiliates AS PERMISSIVE FOR SELECT TO authenticated
USING (public.has_own_role('admin'::app_role));

CREATE POLICY "Users can insert own affiliate"
ON public.affiliates AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (approved = false) AND (commission_rate IS NULL));

CREATE POLICY "Users can update own bank details"
ON public.affiliates AS PERMISSIVE FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id) AND
  (approved = (SELECT a.approved FROM public.affiliates a WHERE a.id = affiliates.id)) AND
  (enabled = (SELECT a.enabled FROM public.affiliates a WHERE a.id = affiliates.id)) AND
  (NOT (commission_rate IS DISTINCT FROM (SELECT a.commission_rate FROM public.affiliates a WHERE a.id = affiliates.id))) AND
  (NOT (transfer_recipient_code IS DISTINCT FROM (SELECT a.transfer_recipient_code FROM public.affiliates a WHERE a.id = affiliates.id)))
);

CREATE POLICY "Admins can manage affiliates"
ON public.affiliates AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: sales
-- ==================
CREATE POLICY "Users can view own sales"
ON public.sales AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage sales"
ON public.sales AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: payouts
-- ==================
CREATE POLICY "Affiliates can view own payouts"
ON public.payouts AS PERMISSIVE FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE affiliates.id = payouts.affiliate_id AND affiliates.user_id = auth.uid()
  )
);

CREATE POLICY "Affiliates can request pending payouts"
ON public.payouts AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  (status = 'pending') AND
  (approved_at IS NULL) AND
  (completed_at IS NULL) AND
  (transfer_reference IS NULL) AND
  EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE affiliates.id = payouts.affiliate_id
      AND affiliates.user_id = auth.uid()
      AND affiliates.approved = true
      AND affiliates.enabled = true
  )
);

CREATE POLICY "Admins can manage payouts"
ON public.payouts AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: referral_clicks
-- ==================
CREATE POLICY "Admins can view all clicks"
ON public.referral_clicks AS PERMISSIVE FOR SELECT TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: platform_settings
-- ==================
CREATE POLICY "Admins can manage settings"
ON public.platform_settings AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- ==================
-- TABLE: push_subscriptions
-- ==================
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions AS PERMISSIVE FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all push subscriptions"
ON public.push_subscriptions AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- STEP 3: Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
