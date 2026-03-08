-- 1. Remove the direct INSERT policy on enrollments (prevents payment bypass)
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;

-- 2. Fix affiliate INSERT: trigger to force approved=false and commission_rate=null on insert for non-admins
CREATE OR REPLACE FUNCTION public.prevent_affiliate_self_approval_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.approved := false;
    NEW.enabled := true;
    NEW.commission_rate := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_affiliate_self_approval_insert
  BEFORE INSERT ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_affiliate_self_approval_insert();

-- Also create the UPDATE trigger (was defined as function but trigger was missing)
DROP TRIGGER IF EXISTS trg_prevent_affiliate_self_approval_update ON public.affiliates;
CREATE TRIGGER trg_prevent_affiliate_self_approval_update
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_affiliate_self_approval();

-- 3. Force payout status to 'pending' on INSERT for non-admins
CREATE OR REPLACE FUNCTION public.force_payout_pending_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := 'pending';
    NEW.approved_at := NULL;
    NEW.completed_at := NULL;
    NEW.transfer_reference := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_force_payout_pending
  BEFORE INSERT ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.force_payout_pending_on_insert();

-- 4. Add server-side payout amount validation
CREATE OR REPLACE FUNCTION public.validate_payout_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_earned numeric;
  v_total_paid numeric;
  v_available numeric;
  v_min_withdrawal numeric;
  v_affiliate_approved boolean;
  v_affiliate_enabled boolean;
BEGIN
  -- Only validate for non-admins
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Check affiliate is approved and enabled
  SELECT approved, enabled INTO v_affiliate_approved, v_affiliate_enabled
  FROM public.affiliates WHERE id = NEW.affiliate_id;

  IF NOT v_affiliate_approved OR NOT v_affiliate_enabled THEN
    RAISE EXCEPTION 'Affiliate is not approved or enabled';
  END IF;

  -- Calculate available balance
  SELECT COALESCE(SUM(commission_amount), 0) INTO v_total_earned
  FROM public.sales
  WHERE affiliate_id = NEW.affiliate_id AND status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payouts
  WHERE affiliate_id = NEW.affiliate_id AND status IN ('pending', 'processing', 'completed');

  v_available := v_total_earned - v_total_paid;

  IF NEW.amount > v_available THEN
    RAISE EXCEPTION 'Payout amount exceeds available balance';
  END IF;

  -- Check minimum withdrawal
  SELECT COALESCE(value::numeric, 0) INTO v_min_withdrawal
  FROM public.platform_settings WHERE key = 'min_withdrawal';

  IF v_min_withdrawal > 0 AND NEW.amount < v_min_withdrawal THEN
    RAISE EXCEPTION 'Payout amount is below minimum withdrawal threshold';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payout_amount
  BEFORE INSERT ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payout_amount();