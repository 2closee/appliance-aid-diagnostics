-- Drop ALL existing INSERT policies on repair_center_applications
DROP POLICY IF EXISTS "Allow anonymous application submissions" ON public.repair_center_applications;
DROP POLICY IF EXISTS "Allow authenticated application submissions" ON public.repair_center_applications;
DROP POLICY IF EXISTS "Allow anyone to submit applications (temp debug)" ON public.repair_center_applications;

-- Create a single, fully permissive INSERT policy for debugging
CREATE POLICY "temp_allow_all_inserts"
ON public.repair_center_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Add comment
COMMENT ON POLICY "temp_allow_all_inserts" ON public.repair_center_applications 
IS 'TEMPORARY: Allows all inserts to debug RLS. Will be replaced with proper policies.';