-- Fix the security definer view issue by recreating the view with proper security
-- Drop the current view first
DROP VIEW IF EXISTS public.repair_centers_public;

-- Recreate the view without SECURITY DEFINER (it's not needed here since we want invoker rights)
CREATE VIEW public.repair_centers_public AS
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
  -- Don't expose: email, phone, cac_name, cac_number, tax_id, full address
  number_of_staff,
  years_of_experience
FROM "Repair Center";

-- The view will use the permissions of the querying user, which is safer
-- Grant appropriate permissions
GRANT SELECT ON public.repair_centers_public TO anon;
GRANT SELECT ON public.repair_centers_public TO authenticated;