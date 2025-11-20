-- Add address_updated_at timestamp to track address changes
ALTER TABLE "Repair Center" 
ADD COLUMN address_updated_at timestamp with time zone;

-- Update RLS policy to allow address updates with time restriction
DROP POLICY IF EXISTS "Repair center staff can update their branding" ON "Repair Center";

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
    (address IS DISTINCT FROM (SELECT address FROM "Repair Center" WHERE id = "Repair Center".id) 
     AND (address_updated_at IS NULL OR address_updated_at <= NOW() - INTERVAL '30 days'))
    OR 
    -- Allow other field updates without time restriction
    address IS NOT DISTINCT FROM (SELECT address FROM "Repair Center" WHERE id = "Repair Center".id)
    OR
    -- Admins can update anytime
    has_role(auth.uid(), 'admin'::app_role)
  )
);