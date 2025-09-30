-- Phase 1: Fix RLS Policy Infinite Recursion
-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Business owners can manage their staff records" ON public.repair_center_staff;
DROP POLICY IF EXISTS "New users can create initial owner staff record" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Owners can manage staff in their centers" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Repair center admins can manage staff" ON public.repair_center_staff;

-- Phase 2: Create Application-Specific INSERT Policy
-- Allow new users to create their initial owner staff record during application
CREATE POLICY "Allow initial owner staff record creation" 
ON public.repair_center_staff 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND is_owner = true 
  AND is_active = false
);

-- Phase 3: Maintain Security with Separate Policies
-- Allow existing active owners to manage staff in their centers
CREATE POLICY "Active owners can manage center staff" 
ON public.repair_center_staff 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.repair_center_id = repair_center_staff.repair_center_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_owner = true
    AND rcs.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.repair_center_id = repair_center_staff.repair_center_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_owner = true
    AND rcs.is_active = true
  )
);

-- Allow active repair center admins to manage staff
CREATE POLICY "Active admins can manage center staff" 
ON public.repair_center_staff 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.repair_center_id = repair_center_staff.repair_center_id
    AND rcs.user_id = auth.uid()
    AND rcs.role = 'admin'
    AND rcs.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.repair_center_id = repair_center_staff.repair_center_id
    AND rcs.user_id = auth.uid()
    AND rcs.role = 'admin'
    AND rcs.is_active = true
  )
);