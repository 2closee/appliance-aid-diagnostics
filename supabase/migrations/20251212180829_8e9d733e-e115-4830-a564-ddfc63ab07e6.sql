-- Strengthen bank account RLS policies
-- Issue: All staff can view bank details, should be owners only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Repair centers view own accounts" ON repair_center_bank_accounts;
DROP POLICY IF EXISTS "Repair centers create own account" ON repair_center_bank_accounts;
DROP POLICY IF EXISTS "Repair centers update own account" ON repair_center_bank_accounts;

-- Only CENTER OWNERS can view bank account details (not all staff)
CREATE POLICY "Center owners can view bank accounts"
ON repair_center_bank_accounts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND user_is_center_owner(auth.uid(), repair_center_id)
);

-- Only CENTER OWNERS can create bank accounts
CREATE POLICY "Center owners can create bank account"
ON repair_center_bank_accounts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_is_center_owner(auth.uid(), repair_center_id)
  AND NOT EXISTS (
    SELECT 1 FROM repair_center_bank_accounts ba
    WHERE ba.repair_center_id = repair_center_bank_accounts.repair_center_id
    AND ba.is_active = true
  )
);

-- Only CENTER OWNERS can update bank accounts (with 14-day cooldown)
CREATE POLICY "Center owners can update bank account"
ON repair_center_bank_accounts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND user_is_center_owner(auth.uid(), repair_center_id)
  AND (
    last_updated_at <= (now() - '14 days'::interval)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_is_center_owner(auth.uid(), repair_center_id)
);