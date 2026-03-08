
-- Convert all access-granting RLS policies to PERMISSIVE

-- AFFILIATES
DROP POLICY IF EXISTS "Admins can manage affiliates" ON public.affiliates;
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all affiliates" ON public.affiliates;
CREATE POLICY "Admins can view all affiliates" ON public.affiliates FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Users can view own affiliate data" ON public.affiliates;
CREATE POLICY "Users can view own affiliate data" ON public.affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own affiliate" ON public.affiliates;
CREATE POLICY "Users can insert own affiliate" ON public.affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND approved = false AND commission_rate IS NULL);

DROP POLICY IF EXISTS "Users can update own bank details" ON public.affiliates;
CREATE POLICY "Users can update own bank details" ON public.affiliates FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND approved = (SELECT a.approved FROM affiliates a WHERE a.id = affiliates.id)
  AND enabled = (SELECT a.enabled FROM affiliates a WHERE a.id = affiliates.id)
  AND NOT (commission_rate IS DISTINCT FROM (SELECT a.commission_rate FROM affiliates a WHERE a.id = affiliates.id))
  AND NOT (transfer_recipient_code IS DISTINCT FROM (SELECT a.transfer_recipient_code FROM affiliates a WHERE a.id = affiliates.id))
);

-- BOOKMARKS
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- COURSES
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON public.courses;
CREATE POLICY "Published courses are viewable by everyone" ON public.courses FOR SELECT USING (published = true OR has_own_role('admin'::app_role));

-- ENROLLMENTS
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- LESSON_PROGRESS
DROP POLICY IF EXISTS "Users can manage own progress" ON public.lesson_progress;
CREATE POLICY "Users can manage own progress" ON public.lesson_progress FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM lessons l JOIN modules m ON m.id = l.module_id JOIN enrollments e ON e.course_id = m.course_id
  WHERE l.id = lesson_progress.lesson_id AND e.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update own progress" ON public.lesson_progress;
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own progress" ON public.lesson_progress;
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- LESSONS
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Lessons viewable by enrolled users" ON public.lessons;
CREATE POLICY "Lessons viewable by enrolled users" ON public.lessons FOR SELECT TO authenticated
USING (has_own_role('admin'::app_role) OR EXISTS (
  SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id JOIN enrollments e ON e.course_id = c.id
  WHERE m.id = lessons.module_id AND e.user_id = auth.uid()
));

-- MODULES
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Modules viewable by enrolled users" ON public.modules;
CREATE POLICY "Modules viewable by enrolled users" ON public.modules FOR SELECT TO authenticated
USING (has_own_role('admin'::app_role) OR EXISTS (
  SELECT 1 FROM courses c JOIN enrollments e ON e.course_id = c.id
  WHERE c.id = modules.course_id AND e.user_id = auth.uid()
));

-- PAYOUTS
DROP POLICY IF EXISTS "Admins can manage payouts" ON public.payouts;
CREATE POLICY "Admins can manage payouts" ON public.payouts FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;
CREATE POLICY "Admins can view all payouts" ON public.payouts FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Affiliates can request pending payouts" ON public.payouts;
CREATE POLICY "Affiliates can request pending payouts" ON public.payouts FOR INSERT TO authenticated
WITH CHECK (status = 'pending' AND approved_at IS NULL AND completed_at IS NULL AND transfer_reference IS NULL
  AND EXISTS (SELECT 1 FROM affiliates WHERE affiliates.id = payouts.affiliate_id AND affiliates.user_id = auth.uid() AND affiliates.approved = true AND affiliates.enabled = true));

DROP POLICY IF EXISTS "Affiliates can view own payouts" ON public.payouts;
CREATE POLICY "Affiliates can view own payouts" ON public.payouts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM affiliates WHERE affiliates.id = payouts.affiliate_id AND affiliates.user_id = auth.uid()));

-- PLATFORM_SETTINGS
DROP POLICY IF EXISTS "Admins can manage settings" ON public.platform_settings;
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can read all settings" ON public.platform_settings;
CREATE POLICY "Admins can read all settings" ON public.platform_settings FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

-- PROFILES
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
CREATE POLICY "Profiles visibility" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_public = true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- PUSH_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Service role can manage all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role can manage all push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- REFERRAL_CLICKS
DROP POLICY IF EXISTS "Admins can view all clicks" ON public.referral_clicks;
CREATE POLICY "Admins can view all clicks" ON public.referral_clicks FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

-- SALES
DROP POLICY IF EXISTS "Admins can manage sales" ON public.sales;
CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;
CREATE POLICY "Admins can view all sales" ON public.sales FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
CREATE POLICY "Users can view own sales" ON public.sales FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
