-- Drop existing insert policy that's not working
DROP POLICY IF EXISTS "Anyone can submit repair center applications" ON public.repair_center_applications;

-- Create a new policy that explicitly allows anonymous inserts
CREATE POLICY "Allow anonymous application submissions"
ON public.repair_center_applications
FOR INSERT
TO anon
WITH CHECK (true);

-- Also ensure authenticated users can submit
CREATE POLICY "Allow authenticated application submissions"
ON public.repair_center_applications
FOR INSERT
TO authenticated
WITH CHECK (true);