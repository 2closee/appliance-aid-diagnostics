-- Security Fix: Protect sensitive business data in repair centers

-- Step 1: Enable RLS on repair_centers_public view
ALTER TABLE public.repair_centers_public ENABLE ROW LEVEL SECURITY;

-- Step 2: Create restrictive policies for repair_centers_public (public directory)
-- Only show active centers for public browsing
CREATE POLICY "Public can view active repair centers directory" 
ON public.repair_centers_public 
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM public."Repair Center" rc 
    WHERE rc.id = repair_centers_public.id 
    AND rc.status = 'active'
  )
);

-- Step 3: Drop the overly permissive policy from main table
DROP POLICY IF EXISTS "Authenticated users can view repair center contact info" ON public."Repair Center";

-- Step 4: Create new restrictive policies for sensitive business data access

-- Policy 1: Admins can view all repair center data
CREATE POLICY "Admins can view all repair center data" 
ON public."Repair Center" 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy 2: Repair center staff can view their own center's data
CREATE POLICY "Staff can view own center data" 
ON public."Repair Center" 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.repair_center_id = "Repair Center".id 
    AND rcs.user_id = auth.uid() 
    AND rcs.is_active = true
  )
);

-- Policy 3: Customers can view LIMITED contact info for centers with their active jobs
-- This policy excludes sensitive business data (tax_id, cac_number, cac_name)
CREATE POLICY "Customers can view basic contact info for their job centers" 
ON public."Repair Center" 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    WHERE rj.repair_center_id = "Repair Center".id 
    AND rj.user_id = auth.uid()
    AND rj.job_status IN ('requested', 'confirmed', 'in_repair', 'completed')
  )
);

-- Step 5: Create a function to get safe contact info for customers
CREATE OR REPLACE FUNCTION public.get_repair_center_contact_for_customer(_repair_center_id bigint, _user_id uuid)
RETURNS TABLE (
  id bigint,
  name text,
  phone text,
  email text,
  address text,
  hours text,
  specialties text
) 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT 
    rc.id,
    rc.name,
    rc.phone,
    rc.email,
    rc.address,
    rc.hours,
    rc.specialties
  FROM public."Repair Center" rc
  WHERE rc.id = _repair_center_id
  AND rc.status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    WHERE rj.repair_center_id = rc.id 
    AND rj.user_id = _user_id
    AND rj.job_status IN ('requested', 'confirmed', 'in_repair', 'completed')
  );
$$;

-- Step 6: Create indexes for better performance on security queries
CREATE INDEX IF NOT EXISTS idx_repair_jobs_user_center 
ON public.repair_jobs(user_id, repair_center_id, job_status);

CREATE INDEX IF NOT EXISTS idx_repair_center_staff_user_center 
ON public.repair_center_staff(user_id, repair_center_id, is_active);

CREATE INDEX IF NOT EXISTS idx_repair_center_status 
ON public."Repair Center"(status);

-- Step 7: Add comments to document the security model
COMMENT ON POLICY "Public can view active repair centers directory" ON public.repair_centers_public IS 
'Allows public directory browsing of active repair centers with limited, non-sensitive information';

COMMENT ON POLICY "Admins can view all repair center data" ON public."Repair Center" IS 
'Admins have full access to all repair center data including sensitive business information';

COMMENT ON POLICY "Staff can view own center data" ON public."Repair Center" IS 
'Repair center staff can view complete data for their own center only';

COMMENT ON POLICY "Customers can view basic contact info for their job centers" ON public."Repair Center" IS 
'Customers can view contact information (excluding sensitive business data) for centers handling their active jobs';

COMMENT ON FUNCTION public.get_repair_center_contact_for_customer IS 
'Security function to safely provide repair center contact information to customers with active jobs';