-- Fix RLS policy to allow admins to see applications from repair_center_applications table
CREATE POLICY "Admins can view repair_center_applications"
ON public.repair_center_applications
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);