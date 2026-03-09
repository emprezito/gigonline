
-- Create storage bucket for lesson files (PDFs, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload files
CREATE POLICY "Admins can upload lesson files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-files'
  AND public.has_own_role('admin'::public.app_role)
);

-- Allow admins to update files
CREATE POLICY "Admins can update lesson files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson-files'
  AND public.has_own_role('admin'::public.app_role)
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete lesson files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-files'
  AND public.has_own_role('admin'::public.app_role)
);

-- Allow anyone to read lesson files (public bucket)
CREATE POLICY "Anyone can read lesson files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-files');
