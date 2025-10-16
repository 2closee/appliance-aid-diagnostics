-- Fix critical security issues identified in security scan

-- 1. Fix repair_center_staff cross-center data exposure
-- Drop the overly permissive policy that allows any authenticated user to view all staff
DROP POLICY IF EXISTS "View staff records for operations" ON public.repair_center_staff;

-- Create a restricted policy that only allows viewing staff from the same center
CREATE POLICY "Staff can only view same center staff" 
ON public.repair_center_staff 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.user_id = auth.uid()
    AND rcs.repair_center_id = repair_center_staff.repair_center_id
    AND rcs.is_active = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Fix repair_center_applications public exposure
-- Add explicit blocking policy to prevent public read access
CREATE POLICY "Block public read of applications" 
ON public.repair_center_applications 
FOR SELECT 
USING (false);

-- Ensure admins can still read applications (this policy already exists but adding for completeness)
-- The existing "Admins can view all repair center applications" policy covers this