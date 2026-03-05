
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS transfer_recipient_code text;
