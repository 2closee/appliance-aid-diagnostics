-- Fix Repair Center table RLS policies to allow applications
-- Drop existing policies first to avoid conflicts

DROP POLICY IF EXISTS "Admins can insert repair centers" ON "Repair Center";
DROP POLICY IF EXISTS "Admins can view all repair centers" ON "Repair Center";
DROP POLICY IF EXISTS "Admins can update repair centers" ON "Repair Center";
DROP POLICY IF EXISTS "Admins can delete repair centers" ON "Repair Center";

-- Create new policies that allow applications to be submitted
CREATE POLICY "Users can create repair center applications" 
ON "Repair Center" 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Admins can manage repair centers" 
ON "Repair Center" 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete repair centers" 
ON "Repair Center" 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));