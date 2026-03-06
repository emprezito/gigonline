-- Update default commission rate to 50% on courses table
ALTER TABLE public.courses ALTER COLUMN commission_rate SET DEFAULT 50;

-- Update existing courses to 50% commission
UPDATE public.courses SET commission_rate = 50;

-- Add columns to payouts table for the approval workflow
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS transfer_reference text;