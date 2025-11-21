-- Create security definer function to get current address without triggering RLS
CREATE OR REPLACE FUNCTION public.get_repair_center_address(_center_id bigint)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT address FROM "Repair Center" WHERE id = _center_id;
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "Repair centers can update their info with restrictions" ON "Repair Center";

-- Recreate policy using the security definer function
CREATE POLICY "Repair centers can update their info with restrictions"
ON "Repair Center"
FOR UPDATE
USING (
  is_staff_at_center(auth.uid(), id) AND deleted_at IS NULL
)
WITH CHECK (
  is_staff_at_center(auth.uid(), id) AND 
  deleted_at IS NULL AND
  (
    -- Allow address updates only once per month for staff
    (address IS DISTINCT FROM get_repair_center_address(id) 
     AND (address_updated_at IS NULL OR address_updated_at <= NOW() - INTERVAL '30 days'))
    OR 
    -- Allow other field updates without time restriction
    address IS NOT DISTINCT FROM get_repair_center_address(id)
    OR
    -- Admins can update anytime
    has_role(auth.uid(), 'admin'::app_role)
  )
);