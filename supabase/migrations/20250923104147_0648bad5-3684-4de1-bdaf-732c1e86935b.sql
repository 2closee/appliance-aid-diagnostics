-- Fix the security definer view issue
-- The repair_centers_public view needs to be recreated with security_invoker = true
-- to ensure it respects RLS policies properly

-- Drop and recreate the view with proper security settings
DROP VIEW IF EXISTS public.repair_centers_public;

CREATE VIEW public.repair_centers_public
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  -- Only show general location, not full address for privacy
  CASE 
    WHEN address IS NOT NULL AND address != '' THEN 
      CASE
        WHEN position(',' in address) > 0 THEN
          trim(substring(address from position(',' in address) + 1))
        ELSE 'Location Available'
      END
    ELSE 'Location Available'
  END as general_location,
  hours,
  specialties,
  -- Safe business info that's not sensitive
  number_of_staff,
  years_of_experience
FROM public."Repair Center";

-- Grant permissions to the view
GRANT SELECT ON public.repair_centers_public TO anon;
GRANT SELECT ON public.repair_centers_public TO authenticated;