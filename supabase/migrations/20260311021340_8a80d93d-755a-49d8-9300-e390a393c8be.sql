
-- Create testimonial_screenshots table
CREATE TABLE public.testimonial_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonial_screenshots ENABLE ROW LEVEL SECURITY;

-- Everyone can view testimonials (public landing page)
CREATE POLICY "Anyone can view testimonials"
  ON public.testimonial_screenshots
  FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anon to view (for non-logged-in visitors)
CREATE POLICY "Anon can view testimonials"
  ON public.testimonial_screenshots
  FOR SELECT
  TO anon
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage testimonials"
  ON public.testimonial_screenshots
  FOR ALL
  TO authenticated
  USING (public.has_own_role('admin'::app_role));

-- Create storage bucket for testimonial images
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonials', 'testimonials', true);

-- Allow anyone to read testimonial images
CREATE POLICY "Anyone can view testimonial images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'testimonials');

-- Admins can upload testimonial images
CREATE POLICY "Admins can upload testimonial images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'testimonials' AND public.has_own_role('admin'::app_role));

-- Admins can delete testimonial images
CREATE POLICY "Admins can delete testimonial images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'testimonials' AND public.has_own_role('admin'::app_role));
