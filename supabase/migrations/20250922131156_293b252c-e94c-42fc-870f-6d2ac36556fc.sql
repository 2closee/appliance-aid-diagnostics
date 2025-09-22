-- Fix infinite recursion in repair_center_staff policies
-- Drop the problematic policy that causes self-reference
DROP POLICY IF EXISTS "Repair center admins can manage their staff" ON public.repair_center_staff;

-- Create a safe policy that doesn't cause recursion
-- Admins can already manage everything via the general admin policy
-- Staff can view their own record via the existing policy
-- We'll add a specific policy for repair center admin operations without self-reference

-- Create a function to check if user is repair center admin for a specific center
CREATE OR REPLACE FUNCTION public.is_repair_center_admin(_user_id uuid, _repair_center_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.user_id = _user_id 
    AND rcs.repair_center_id = _repair_center_id 
    AND rcs.role = 'admin'
    AND rcs.is_active = true
  );
$$;

-- Now create non-recursive policies
CREATE POLICY "Repair center admins can manage staff at their center" 
ON public.repair_center_staff 
FOR ALL
USING (
  -- User is either a global admin OR a repair center admin for this specific center
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    -- Check if current user is admin of the repair center without self-reference
    auth.uid() IN (
      SELECT rcs.user_id 
      FROM public.repair_center_staff rcs 
      WHERE rcs.repair_center_id = repair_center_staff.repair_center_id 
      AND rcs.role = 'admin' 
      AND rcs.is_active = true
    )
  )
);