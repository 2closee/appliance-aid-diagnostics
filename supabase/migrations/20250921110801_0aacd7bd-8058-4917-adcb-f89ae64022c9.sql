-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read repair centers" ON public."Repair Center";

-- Create more restrictive policies for repair center access
CREATE POLICY "Users can view repair centers for their jobs" 
ON public."Repair Center" 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj 
    WHERE rj.repair_center_id = "Repair Center".id 
    AND rj.user_id = auth.uid()
  )
);

CREATE POLICY "Repair center staff can view their center" 
ON public."Repair Center" 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs 
    WHERE rcs.repair_center_id = "Repair Center".id 
    AND rcs.user_id = auth.uid() 
    AND rcs.is_active = true
  )
);

CREATE POLICY "Admins can view all repair centers" 
ON public."Repair Center" 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public read access for basic repair center listing (without sensitive contact info)
-- This policy allows users to see repair centers for selection purposes
CREATE POLICY "Public can view basic repair center info" 
ON public."Repair Center" 
FOR SELECT 
USING (true);