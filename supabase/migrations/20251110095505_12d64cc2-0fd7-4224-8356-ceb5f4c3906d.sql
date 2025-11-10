-- Add soft delete columns to Repair Center table
ALTER TABLE "Repair Center" 
ADD COLUMN deleted_at TIMESTAMPTZ,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

-- Create index for performance on soft delete queries
CREATE INDEX idx_repair_center_deleted_at ON "Repair Center"(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update existing SELECT policies to exclude soft-deleted centers
DROP POLICY IF EXISTS "Admins and staff can view repair centers" ON "Repair Center";
DROP POLICY IF EXISTS "Admins can view all repair center data" ON "Repair Center";
DROP POLICY IF EXISTS "Repair center staff can view their center" ON "Repair Center";
DROP POLICY IF EXISTS "Staff can view own center data" ON "Repair Center";
DROP POLICY IF EXISTS "Users can view repair centers for their jobs" ON "Repair Center";
DROP POLICY IF EXISTS "Customers can view basic contact info for their job centers" ON "Repair Center";

-- Recreate SELECT policies with soft delete filter
CREATE POLICY "Admins can view all repair center data including deleted" 
ON "Repair Center" FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view their active center" 
ON "Repair Center" FOR SELECT
USING (
  is_staff_at_center(auth.uid(), id) 
  AND deleted_at IS NULL
);

CREATE POLICY "Users can view active repair centers for their jobs" 
ON "Repair Center" FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM repair_jobs rj
    WHERE rj.repair_center_id = "Repair Center".id 
    AND rj.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view contact info for their job centers" 
ON "Repair Center" FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM repair_jobs rj
    WHERE rj.repair_center_id = "Repair Center".id 
    AND rj.user_id = auth.uid()
    AND rj.job_status IN ('requested', 'pickup_scheduled', 'picked_up', 'in_repair', 'repair_completed', 'ready_for_return', 'returned', 'completed')
  )
);

-- Update the get_public_repair_centers function to exclude deleted centers
CREATE OR REPLACE FUNCTION public.get_public_repair_centers()
RETURNS TABLE(id bigint, name text, general_location text, hours text, specialties text, number_of_staff integer, years_of_experience integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  WHERE rc.status = 'active' 
  AND rc.deleted_at IS NULL;
$function$;