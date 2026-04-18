-- Read receipts table for community channels
CREATE TABLE public.channel_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  last_read_message_id UUID,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id)
);

ALTER TABLE public.channel_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view read receipts"
  ON public.channel_reads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upsert own read receipts"
  ON public.channel_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read receipts"
  ON public.channel_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_channel_reads_channel ON public.channel_reads(channel_id);

-- Enable realtime for channel_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_reads;