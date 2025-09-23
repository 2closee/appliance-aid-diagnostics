-- Fix the critical security issue with public access to sensitive business data
-- Remove the dangerous public policy that exposes all repair center data

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view limited repair center info" ON public."Repair Center";

-- Ensure the repair_centers_public view exists with only safe, non-sensitive data
-- Drop and recreate to ensure it has the correct structure
DROP VIEW IF EXISTS public.repair_centers_public;

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
  -- Safe business info that's not sensitive
  number_of_staff,
  years_of_experience
FROM public."Repair Center";

-- Grant permissions only to the public view (not the main table)
GRANT SELECT ON public.repair_centers_public TO anon;
GRANT SELECT ON public.repair_centers_public TO authenticated;

-- Note: Views don't support RLS directly, but they inherit security from underlying tables
-- The view is secure because:
-- 1. It only exposes non-sensitive columns
-- 2. The main "Repair Center" table now has no public access
-- 3. All sensitive data (email, phone, tax_id, cac_number, full address) is excluded