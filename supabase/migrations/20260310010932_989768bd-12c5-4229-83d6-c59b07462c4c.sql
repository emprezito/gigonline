
-- ===== AFFILIATES =====
DROP POLICY "Admins can manage affiliates" ON public.affiliates;
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Admins can view all affiliates" ON public.affiliates;
CREATE POLICY "Admins can view all affiliates" ON public.affiliates FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Users can insert own affiliate" ON public.affiliates;
CREATE POLICY "Users can insert own affiliate" ON public.affiliates FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (approved = false) AND (commission_rate IS NULL));

DROP POLICY "Users can update own bank details" ON public.affiliates;
CREATE POLICY "Users can update own bank details" ON public.affiliates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    (auth.uid() = user_id)
    AND (approved = (SELECT a.approved FROM public.affiliates a WHERE a.id = affiliates.id))
    AND (enabled = (SELECT a.enabled FROM public.affiliates a WHERE a.id = affiliates.id))
    AND (NOT (commission_rate IS DISTINCT FROM (SELECT a.commission_rate FROM public.affiliates a WHERE a.id = affiliates.id)))
    AND (NOT (transfer_recipient_code IS DISTINCT FROM (SELECT a.transfer_recipient_code FROM public.affiliates a WHERE a.id = affiliates.id)))
    AND (referral_code = (SELECT a.referral_code FROM public.affiliates a WHERE a.id = affiliates.id))
  );

DROP POLICY "Users can view own affiliate data" ON public.affiliates;
CREATE POLICY "Users can view own affiliate data" ON public.affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== BOOKMARKS =====
DROP POLICY "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== COURSES =====
DROP POLICY "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Published courses viewable by everyone" ON public.courses;
CREATE POLICY "Published courses viewable by everyone" ON public.courses FOR SELECT TO authenticated USING ((published = true) OR has_own_role('admin'::app_role));

-- ===== ENROLLMENTS =====
DROP POLICY "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== LESSON_PROGRESS =====
DROP POLICY "Users can insert own progress" ON public.lesson_progress;
CREATE POLICY "Users can insert own progress" ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND (EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN enrollments e ON e.course_id = m.course_id
    WHERE l.id = lesson_progress.lesson_id AND e.user_id = auth.uid()
  )));

DROP POLICY "Users can update own progress" ON public.lesson_progress;
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can view own progress" ON public.lesson_progress;
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== LESSONS =====
DROP POLICY "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Lessons viewable by enrolled users" ON public.lessons;
CREATE POLICY "Lessons viewable by enrolled users" ON public.lessons FOR SELECT TO authenticated
  USING (has_own_role('admin'::app_role) OR (EXISTS (
    SELECT 1 FROM modules m
    JOIN courses c ON c.id = m.course_id
    JOIN enrollments e ON e.course_id = c.id
    WHERE m.id = lessons.module_id AND e.user_id = auth.uid()
  )));

-- ===== MODULES =====
DROP POLICY "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Modules viewable by enrolled users" ON public.modules;
CREATE POLICY "Modules viewable by enrolled users" ON public.modules FOR SELECT TO authenticated
  USING (has_own_role('admin'::app_role) OR (EXISTS (
    SELECT 1 FROM courses c
    JOIN enrollments e ON e.course_id = c.id
    WHERE c.id = modules.course_id AND e.user_id = auth.uid()
  )));

-- ===== PAYOUTS =====
DROP POLICY "Admins can manage payouts" ON public.payouts;
CREATE POLICY "Admins can manage payouts" ON public.payouts FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Affiliates can request pending payouts" ON public.payouts;
CREATE POLICY "Affiliates can request pending payouts" ON public.payouts FOR INSERT TO authenticated
  WITH CHECK (
    (status = 'pending'::text)
    AND (approved_at IS NULL)
    AND (completed_at IS NULL)
    AND (transfer_reference IS NULL)
    AND (EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = payouts.affiliate_id
        AND affiliates.user_id = auth.uid()
        AND affiliates.approved = true
        AND affiliates.enabled = true
    ))
    AND (amount > 0::numeric)
    AND (amount <= (
      COALESCE((SELECT sum(s.commission_amount) FROM sales s WHERE s.affiliate_id = payouts.affiliate_id AND s.status = 'completed'::text), 0::numeric)
      - COALESCE((SELECT sum(p.amount) FROM payouts p WHERE p.affiliate_id = payouts.affiliate_id AND p.status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text])), 0::numeric)
    ))
  );

DROP POLICY "Affiliates can view own payouts" ON public.payouts;
CREATE POLICY "Affiliates can view own payouts" ON public.payouts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM affiliates WHERE affiliates.id = payouts.affiliate_id AND affiliates.user_id = auth.uid()
  ));

-- ===== PLATFORM_SETTINGS =====
DROP POLICY "Admins can manage all settings" ON public.platform_settings;
CREATE POLICY "Admins can manage all settings" ON public.platform_settings FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Authenticated users can read public settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read public settings" ON public.platform_settings FOR SELECT TO authenticated USING (is_public = true);

-- ===== PROFILES =====
DROP POLICY "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY "Users can view own or public profiles" ON public.profiles;
CREATE POLICY "Users can view own or public profiles" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id) OR (is_public = true));

-- ===== PUSH_SUBSCRIPTIONS =====
DROP POLICY "Admins can manage all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can manage all push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== REFERRAL_CLICKS =====
DROP POLICY "Admins can view all clicks" ON public.referral_clicks;
CREATE POLICY "Admins can view all clicks" ON public.referral_clicks FOR SELECT TO authenticated USING (has_own_role('admin'::app_role));

-- ===== SALES =====
DROP POLICY "Admins can manage sales" ON public.sales;
CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Users can view own sales" ON public.sales;
CREATE POLICY "Users can view own sales" ON public.sales FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== USAGE_TRACKING =====
DROP POLICY "Admins can manage usage" ON public.usage_tracking;
CREATE POLICY "Admins can manage usage" ON public.usage_tracking FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Users can insert own usage" ON public.usage_tracking;
CREATE POLICY "Users can insert own usage" ON public.usage_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can view own usage" ON public.usage_tracking;
CREATE POLICY "Users can view own usage" ON public.usage_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== USER_ROLES =====
DROP POLICY "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_own_role('admin'::app_role));

DROP POLICY "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
