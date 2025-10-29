-- Create repair center bank accounts table
CREATE TABLE IF NOT EXISTS public.repair_center_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_center_id BIGINT NOT NULL REFERENCES public."Repair Center"(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  whitelisted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(repair_center_id, is_active)
);

-- Enable RLS
ALTER TABLE public.repair_center_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Repair centers can view their own bank accounts
CREATE POLICY "Repair centers view own accounts"
ON public.repair_center_bank_accounts
FOR SELECT
USING (is_staff_at_center(auth.uid(), repair_center_id));

-- Repair centers can insert their own bank account (only if they don't have an active one)
CREATE POLICY "Repair centers create own account"
ON public.repair_center_bank_accounts
FOR INSERT
WITH CHECK (
  is_staff_at_center(auth.uid(), repair_center_id) 
  AND NOT EXISTS (
    SELECT 1 FROM public.repair_center_bank_accounts 
    WHERE repair_center_id = repair_center_bank_accounts.repair_center_id 
    AND is_active = true
  )
);

-- Repair centers can update their own account (with 2-week restriction)
CREATE POLICY "Repair centers update own account"
ON public.repair_center_bank_accounts
FOR UPDATE
USING (
  is_staff_at_center(auth.uid(), repair_center_id) 
  AND (
    -- Allow if 2 weeks have passed since last update
    last_updated_at <= (now() - INTERVAL '14 days')
    -- Or if admin is making the change
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (is_staff_at_center(auth.uid(), repair_center_id));

-- Admins can manage all bank accounts
CREATE POLICY "Admins manage all accounts"
ON public.repair_center_bank_accounts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.repair_center_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_bank_accounts_repair_center ON public.repair_center_bank_accounts(repair_center_id);
CREATE INDEX idx_bank_accounts_active ON public.repair_center_bank_accounts(repair_center_id, is_active) WHERE is_active = true;