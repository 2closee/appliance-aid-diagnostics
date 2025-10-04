-- Add SELECT policy for repair_center_applications to allow reading back inserted rows
DROP POLICY IF EXISTS "temp_allow_all_selects" ON public.repair_center_applications;

CREATE POLICY "temp_allow_all_selects"
ON public.repair_center_applications
FOR SELECT
TO public
USING (true);

COMMENT ON POLICY "temp_allow_all_selects" ON public.repair_center_applications 
IS 'TEMPORARY: Allows all selects for debugging. Will be replaced with proper policies.';