-- Fix critical security vulnerability in repair_center_staff table
-- The current "Allow staff record creation" policy allows any authenticated user
-- to add themselves to any repair center, which would give them access to customer data

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow staff record creation" ON public.repair_center_staff;

-- Create a more secure policy that only allows:
-- 1. Admins to create staff records
-- 2. Repair center owners to add staff to their own centers
-- 3. Automatic self-creation when someone applies to become a repair center (with is_active = false by default)

CREATE POLICY "Admins can create staff records" ON public.repair_center_staff
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can add staff to their centers" ON public.repair_center_staff
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM repair_center_staff rcs_owner
    WHERE rcs_owner.repair_center_id = repair_center_staff.repair_center_id
    AND rcs_owner.user_id = auth.uid()
    AND rcs_owner.is_owner = true
    AND rcs_owner.is_active = true
  )
);

-- Allow users to create their own staff record ONLY when applying to create a new repair center
-- This should be used only during the repair center application process
CREATE POLICY "Users can apply as repair center staff" ON public.repair_center_staff
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
  AND is_owner = true
  AND is_active = false  -- Must be inactive until approved
);

-- Additional security: Add a trigger to prevent privilege escalation
-- Ensure that regular staff cannot promote themselves to owners
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent non-owners from setting themselves as owners
  IF NEW.is_owner = true AND OLD.is_owner = false THEN
    -- Only allow if the user is an admin or an existing owner of the same center
    IF NOT (
      has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM repair_center_staff rcs
        WHERE rcs.repair_center_id = NEW.repair_center_id
        AND rcs.user_id = auth.uid()
        AND rcs.is_owner = true
        AND rcs.is_active = true
      )
    ) THEN
      RAISE EXCEPTION 'Access denied: Cannot promote self to owner without proper authorization';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
CREATE TRIGGER prevent_self_privilege_escalation_trigger
  BEFORE UPDATE ON public.repair_center_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();