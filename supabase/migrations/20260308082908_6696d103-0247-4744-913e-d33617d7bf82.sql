
-- Add is_public flag to profiles (default false for privacy)
ALTER TABLE public.profiles ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Replace the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Users can always see their own profile; others only see opted-in public profiles
CREATE POLICY "Profiles visibility" ON public.profiles FOR SELECT
USING (auth.uid() = id OR is_public = true);
