
CREATE TABLE public.affiliate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  promotion_plan TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can submit applications" ON public.affiliate_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own applications" ON public.affiliate_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage applications" ON public.affiliate_applications FOR ALL TO authenticated USING (public.has_own_role('admin'::app_role));

CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_read_only BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view channels" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage channels" ON public.channels FOR ALL TO authenticated USING (public.has_own_role('admin'::app_role));

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentioned_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users and mods can delete messages" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_own_role('admin'::app_role) OR public.has_own_role('moderator'::app_role));

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  message_preview TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_own_role('admin'::app_role));

CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

INSERT INTO public.channels (name, category, description, is_read_only, sort_order) VALUES
  ('welcome', 'Community', 'Welcome to the GhostPen community!', true, 1),
  ('announcements', 'Community', 'Important announcements from the team', true, 2),
  ('general', 'Community', 'General discussion', false, 3),
  ('platform-help', 'Course Help', 'Get help with the platform', false, 4),
  ('writing-tips', 'Course Help', 'Share and discuss writing tips', false, 5),
  ('payment-questions', 'Course Help', 'Payment related questions', false, 6),
  ('wins', 'Wins', 'Share your writing wins!', false, 7),
  ('milestones', 'Wins', 'Celebrate your milestones', false, 8),
  ('affiliate-general', 'Affiliate Program', 'Affiliate discussion', false, 9),
  ('affiliate-wins', 'Affiliate Program', 'Affiliate success stories', false, 10);
