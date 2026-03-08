-- 1. Replace affiliate SELECT policy for referral_clicks to use a function that excludes ip_address
-- Drop existing affiliate policy
DROP POLICY IF EXISTS "Affiliates can view own clicks" ON public.referral_clicks;

-- Create a function that returns clicks without IP
CREATE OR REPLACE FUNCTION public.get_affiliate_clicks(p_affiliate_id uuid)
RETURNS TABLE(id uuid, affiliate_id uuid, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.id, rc.affiliate_id, rc.created_at
  FROM public.referral_clicks rc
  JOIN public.affiliates a ON a.id = rc.affiliate_id
  WHERE rc.affiliate_id = p_affiliate_id
    AND a.user_id = auth.uid();
$$;

-- Keep admin SELECT policy, add a restricted affiliate policy that blocks direct access
-- (affiliates must use the function instead)
-- We can't easily restrict columns via RLS, so we remove affiliate direct SELECT
-- and they use the function above

-- 2. Create a function for affiliate sales that excludes user_id and payment_ref
CREATE OR REPLACE FUNCTION public.get_affiliate_sales(p_affiliate_id uuid)
RETURNS TABLE(id uuid, course_id uuid, amount numeric, commission_amount numeric, status text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.course_id, s.amount, s.commission_amount, s.status, s.created_at
  FROM public.sales s
  JOIN public.affiliates a ON a.id = s.affiliate_id
  WHERE s.affiliate_id = p_affiliate_id
    AND a.user_id = auth.uid()
    AND s.status = 'completed';
$$;

-- Remove affiliate direct SELECT on sales
DROP POLICY IF EXISTS "Affiliates can view attributed sales" ON public.sales;