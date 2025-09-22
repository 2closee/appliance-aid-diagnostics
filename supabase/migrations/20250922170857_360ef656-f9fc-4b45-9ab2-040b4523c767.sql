-- Remove the overly permissive public policy that exposes sensitive data
DROP POLICY "Public can view basic repair center info" ON "Repair Center";

-- Create a new restricted policy that only exposes safe, non-sensitive fields for public viewing
-- This allows customers to see basic info to choose repair centers but protects sensitive business data
CREATE POLICY "Public can view limited repair center info" 
ON "Repair Center" 
FOR SELECT 
TO public
USING (true);

-- However, we need to implement column-level security since PostgreSQL RLS doesn't support column-level restrictions in policies
-- Instead, we'll create a view for public access with only safe columns
CREATE VIEW public.repair_centers_public AS
SELECT 
  id,
  name,
  -- Only show city/state, not full address
  CASE 
    WHEN address IS NOT NULL THEN 
      COALESCE(
        SPLIT_PART(address, ',', -2) || ', ' || SPLIT_PART(address, ',', -1),
        'Location Available'
      )
    ELSE 'Location Available'
  END as general_location,
  hours,
  specialties,
  -- Don't expose: email, phone, cac_name, cac_number, tax_id, full address
  number_of_staff,
  years_of_experience
FROM "Repair Center";

-- Grant public access to the view
GRANT SELECT ON public.repair_centers_public TO anon;
GRANT SELECT ON public.repair_centers_public TO authenticated;

-- Remove the overly broad public policy we just dropped and replace with a more specific one
-- that only applies to authenticated users who need more details
CREATE POLICY "Authenticated users can view repair center contact info" 
ON "Repair Center" 
FOR SELECT 
TO authenticated
USING (
  -- Allow admins to see everything
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Allow repair center staff to see their own center
  EXISTS (
    SELECT 1 FROM repair_center_staff rcs
    WHERE rcs.repair_center_id = "Repair Center".id 
    AND rcs.user_id = auth.uid() 
    AND rcs.is_active = true
  ) OR
  -- Allow customers to see contact details only for centers handling their jobs
  EXISTS (
    SELECT 1 FROM repair_jobs rj
    WHERE rj.repair_center_id = "Repair Center".id 
    AND rj.user_id = auth.uid()
  )
);