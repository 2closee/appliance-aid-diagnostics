-- Fix Repair Center table RLS policies to allow applications
-- The current policies are too restrictive and prevent applications from being saved

-- Update the insert policy to allow authenticated users to create repair center applications
DROP POLICY IF EXISTS "Admins can insert repair centers" ON "Repair Center";

CREATE POLICY "Users can create repair center applications" 
ON "Repair Center" 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Update the view policy to allow repair center staff to view their own center
-- and keep admin access
DROP POLICY IF EXISTS "Admins can view all repair centers" ON "Repair Center";

CREATE POLICY "Admins and staff can view repair centers" 
ON "Repair Center" 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM repair_center_staff rcs 
    WHERE rcs.repair_center_id = "Repair Center".id 
    AND rcs.user_id = auth.uid()
  )
);

-- Allow admins to update repair centers
CREATE POLICY "Admins can update repair centers" 
ON "Repair Center" 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete repair centers
CREATE POLICY "Admins can delete repair centers" 
ON "Repair Center" 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));