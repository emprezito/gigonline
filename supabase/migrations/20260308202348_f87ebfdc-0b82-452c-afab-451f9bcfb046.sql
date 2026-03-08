-- Convert all existing public RLS policies from RESTRICTIVE to PERMISSIVE
-- by dropping and recreating them with identical logic.

-- affiliates
DROP POLICY IF EXISTS "Users can view own affiliate data" ON public.affiliates;
CREATE POLICY "Users can view own affiliate data"
ON public.affiliates
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all affiliates" ON public.affiliates;
CREATE POLICY "Admins can view all affiliates"
ON public.affiliates
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Users can insert own affiliate" ON public.affiliates;
CREATE POLICY "Users can insert own affiliate"
ON public.affiliates
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (approved = false) AND (commission_rate IS NULL));

DROP POLICY IF EXISTS "Users can update own bank details" ON public.affiliates;
CREATE POLICY "Users can update own bank details"
ON public.affiliates
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (approved = (SELECT a.approved FROM public.affiliates a WHERE a.id = affiliates.id))
  AND (enabled = (SELECT a.enabled FROM public.affiliates a WHERE a.id = affiliates.id))
  AND (NOT (commission_rate IS DISTINCT FROM (SELECT a.commission_rate FROM public.affiliates a WHERE a.id = affiliates.id)))
  AND (NOT (transfer_recipient_code IS DISTINCT FROM (SELECT a.transfer_recipient_code FROM public.affiliates a WHERE a.id = affiliates.id)))
);

DROP POLICY IF EXISTS "Admins can manage affiliates" ON public.affiliates;
CREATE POLICY "Admins can manage affiliates"
ON public.affiliates
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- bookmarks
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks"
ON public.bookmarks
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- courses
DROP POLICY IF EXISTS "Published courses viewable by everyone" ON public.courses;
CREATE POLICY "Published courses viewable by everyone"
ON public.courses
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((published = true) OR has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses"
ON public.courses
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- enrollments
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments"
ON public.enrollments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments"
ON public.enrollments
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- lesson_progress
DROP POLICY IF EXISTS "Users can update own progress" ON public.lesson_progress;
CREATE POLICY "Users can update own progress"
ON public.lesson_progress
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own progress" ON public.lesson_progress;
CREATE POLICY "Users can view own progress"
ON public.lesson_progress
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.lesson_progress;
CREATE POLICY "Users can insert own progress"
ON public.lesson_progress
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.enrollments e ON e.course_id = m.course_id
      WHERE l.id = lesson_progress.lesson_id
        AND e.user_id = auth.uid()
    )
  )
);

-- lessons
DROP POLICY IF EXISTS "Lessons viewable by enrolled users" ON public.lessons;
CREATE POLICY "Lessons viewable by enrolled users"
ON public.lessons
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  has_own_role('admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE m.id = lessons.module_id
      AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons"
ON public.lessons
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- modules
DROP POLICY IF EXISTS "Modules viewable by enrolled users" ON public.modules;
CREATE POLICY "Modules viewable by enrolled users"
ON public.modules
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  has_own_role('admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE c.id = modules.course_id
      AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules"
ON public.modules
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- payouts
DROP POLICY IF EXISTS "Admins can manage payouts" ON public.payouts;
CREATE POLICY "Admins can manage payouts"
ON public.payouts
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Affiliates can view own payouts" ON public.payouts;
CREATE POLICY "Affiliates can view own payouts"
ON public.payouts
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.affiliates
    WHERE affiliates.id = payouts.affiliate_id
      AND affiliates.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Affiliates can request pending payouts" ON public.payouts;
CREATE POLICY "Affiliates can request pending payouts"
ON public.payouts
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (status = 'pending'::text)
  AND (approved_at IS NULL)
  AND (completed_at IS NULL)
  AND (transfer_reference IS NULL)
  AND EXISTS (
    SELECT 1
    FROM public.affiliates
    WHERE affiliates.id = payouts.affiliate_id
      AND affiliates.user_id = auth.uid()
      AND affiliates.approved = true
      AND affiliates.enabled = true
  )
);

-- platform_settings
DROP POLICY IF EXISTS "Authenticated users can read public settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read public settings"
ON public.platform_settings
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (is_public = true);

DROP POLICY IF EXISTS "Admins can manage all settings" ON public.platform_settings;
CREATE POLICY "Admins can manage all settings"
ON public.platform_settings
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Users can view own or public profiles" ON public.profiles;
CREATE POLICY "Users can view own or public profiles"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((auth.uid() = id) OR (is_public = true));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- push_subscriptions
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can manage all push subscriptions"
ON public.push_subscriptions
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- referral_clicks
DROP POLICY IF EXISTS "Admins can view all clicks" ON public.referral_clicks;
CREATE POLICY "Admins can view all clicks"
ON public.referral_clicks
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (has_own_role('admin'::app_role));

-- sales
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
CREATE POLICY "Users can view own sales"
ON public.sales
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage sales" ON public.sales;
CREATE POLICY "Admins can manage sales"
ON public.sales
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- usage_tracking
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;
CREATE POLICY "Users can view own usage"
ON public.usage_tracking
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking;
CREATE POLICY "Users can insert own usage"
ON public.usage_tracking
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage usage" ON public.usage_tracking;
CREATE POLICY "Admins can manage usage"
ON public.usage_tracking
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_own_role('admin'::app_role));