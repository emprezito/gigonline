
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'affiliate');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses are viewable by everyone" ON public.courses FOR SELECT USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Modules table
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules viewable with course" ON public.modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND (published = true OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'text')),
  video_url TEXT,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  resources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons viewable with module" ON public.lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND (c.published = true OR public.has_role(auth.uid(), 'admin'))
  )
);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lesson progress
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- Bookmarks
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Affiliates
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  approved BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  commission_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own affiliate data" ON public.affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all affiliates" ON public.affiliates FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own affiliate" ON public.affiliates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referral clicks
CREATE TABLE public.referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view own clicks" ON public.referral_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all clicks" ON public.referral_clicks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  affiliate_id UUID REFERENCES public.affiliates(id),
  commission_amount NUMERIC(10,2) DEFAULT 0,
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sales" ON public.sales FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Affiliates can view attributed sales" ON public.sales FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all sales" ON public.sales FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Payouts
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view own payouts" ON public.payouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Affiliates can request payouts" ON public.payouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all payouts" ON public.payouts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payouts" ON public.payouts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
