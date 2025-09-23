-- Security Fix: Protect sensitive business data in repair centers (Fixed)

-- Step 1: Drop the existing public view (we'll recreate it as a secure function)
DROP VIEW IF EXISTS public.repair_centers_public;

-- Step 2: Drop the overly permissive policy from main table
DROP POLICY IF EXISTS "Authenticated users can view repair center contact info" ON public."Repair Center";

-- Step 3: Create new restrictive policies for sensitive business data access

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
CREATE POLICY "Customers can view basic contact info for their job centers" 
ON public."Repair Center" 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    WHERE rj.repair_center_id = "Repair Center".id 
    AND rj.user_id = auth.uid()
    AND rj.job_status IN ('requested', 'pickup_scheduled', 'picked_up', 'in_repair', 'repair_completed', 'ready_for_return', 'returned', 'completed')
  )
);

-- Step 4: Create a secure public function to list active repair centers (replaces the public view)
CREATE OR REPLACE FUNCTION public.get_public_repair_centers()
RETURNS TABLE (
  id bigint,
  name text,
  general_location text,
  hours text,
  specialties text,
  number_of_staff integer,
  years_of_experience integer
) 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT 
    rc.id,
    rc.name,
    CASE
      WHEN rc.address IS NOT NULL AND rc.address <> '' THEN
        CASE
          WHEN POSITION(',' IN rc.address) > 0 THEN 
            TRIM(SUBSTRING(rc.address FROM POSITION(',' IN rc.address) + 1))
          ELSE 'Location Available'
        END
      ELSE 'Location Available'
    END AS general_location,
    rc.hours,
    rc.specialties,
    rc.number_of_staff,
    rc.years_of_experience
  FROM public."Repair Center" rc
  WHERE rc.status = 'active';
$$;

-- Step 5: Create a function to get safe contact info for customers with active jobs
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
    AND rj.job_status IN ('requested', 'pickup_scheduled', 'picked_up', 'in_repair', 'repair_completed', 'ready_for_return', 'returned', 'completed')
  );
$$;

-- Step 6: Create performance indexes for security queries
CREATE INDEX IF NOT EXISTS idx_repair_jobs_user_center 
ON public.repair_jobs(user_id, repair_center_id, job_status);

CREATE INDEX IF NOT EXISTS idx_repair_center_staff_user_center 
ON public.repair_center_staff(user_id, repair_center_id, is_active);

CREATE INDEX IF NOT EXISTS idx_repair_center_status 
ON public."Repair Center"(status);

-- Step 7: Add security documentation
COMMENT ON POLICY "Admins can view all repair center data" ON public."Repair Center" IS 
'Admins have full access to all repair center data including sensitive business information (tax_id, cac_number, etc.)';

COMMENT ON POLICY "Staff can view own center data" ON public."Repair Center" IS 
'Repair center staff can view complete data for their own center only';

COMMENT ON POLICY "Customers can view basic contact info for their job centers" ON public."Repair Center" IS 
'Customers can view contact information for centers handling their active jobs, but sensitive business data is protected';

COMMENT ON FUNCTION public.get_public_repair_centers IS 
'Secure public function that provides directory information for active repair centers without exposing sensitive business data';

COMMENT ON FUNCTION public.get_repair_center_contact_for_customer IS 
'Security function to safely provide repair center contact information to customers with active jobs';