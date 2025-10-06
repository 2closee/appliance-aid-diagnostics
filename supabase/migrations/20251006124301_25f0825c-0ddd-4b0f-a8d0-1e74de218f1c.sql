-- Fix RLS policies for repair_center_applications
-- Remove duplicate/conflicting SELECT policies and ensure admins can view applications

-- Drop the old policy that directly queries user_roles (can cause issues)
DROP POLICY IF EXISTS "Admins can view all applications" ON public.repair_center_applications;

-- Drop the duplicate policy 
DROP POLICY IF EXISTS "Admins can view repair_center_applications" ON public.repair_center_applications;

-- Recreate a single, clear admin SELECT policy using the security definer function
CREATE POLICY "Admins can view all repair center applications"
ON public.repair_center_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure the UPDATE policy is also using the correct pattern
DROP POLICY IF EXISTS "Admins can update applications" ON public.repair_center_applications;

CREATE POLICY "Admins can update repair center applications"
ON public.repair_center_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));