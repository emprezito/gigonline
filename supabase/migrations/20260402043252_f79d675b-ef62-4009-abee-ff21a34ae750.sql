-- Add reply and media support to messages
ALTER TABLE public.messages
  ADD COLUMN reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN media_url text,
  ADD COLUMN media_type text;

-- Create community-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community-media
CREATE POLICY "Authenticated users can upload community media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-media');

CREATE POLICY "Anyone can view community media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'community-media');

CREATE POLICY "Users can delete own community media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);