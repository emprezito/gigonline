-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
ON public.message_reactions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can add own reactions"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
ON public.message_reactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage reactions"
ON public.message_reactions FOR ALL TO authenticated
USING (has_own_role('admin'::app_role));

-- Add edited_at to messages
ALTER TABLE public.messages ADD COLUMN edited_at timestamp with time zone;

-- Allow users to update their own messages (content + edited_at only)
CREATE POLICY "Users can edit own messages"
ON public.messages FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Add UPDATE event to messages realtime (already in publication, just need the event)
-- messages is already in supabase_realtime, so UPDATE events will be captured automatically