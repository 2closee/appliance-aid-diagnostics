-- Temporary: Create a fully permissive policy to test if role is the issue
-- This allows ANY connection to insert into repair_center_applications
DROP POLICY IF EXISTS "Allow anyone to submit applications (temp debug)" ON public.repair_center_applications;

CREATE POLICY "Allow anyone to submit applications (temp debug)"
ON public.repair_center_applications
FOR INSERT
WITH CHECK (true);

-- Add comment to remind this is temporary
COMMENT ON POLICY "Allow anyone to submit applications (temp debug)" ON public.repair_center_applications 
IS 'TEMPORARY DEBUG POLICY - Allows all inserts to identify RLS role issue. Should be replaced with proper anon/authenticated policies once issue is resolved.';