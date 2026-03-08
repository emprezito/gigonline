
-- Create usage_tracking table for rate limiting
CREATE TABLE public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own usage records
CREATE POLICY "Users can view own usage"
ON public.usage_tracking AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
ON public.usage_tracking AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage usage"
ON public.usage_tracking AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_own_role('admin'::app_role));

-- Index for rate limiting queries
CREATE INDEX idx_usage_tracking_rate_limit 
ON public.usage_tracking (user_id, action_type, created_at);
