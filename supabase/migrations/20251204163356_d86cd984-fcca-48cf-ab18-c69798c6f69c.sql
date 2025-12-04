-- Drop existing policy for repair center staff payment viewing
DROP POLICY IF EXISTS "Repair center staff can view payment status only" ON payments;

-- Create new policy that restricts payment details to center owners only
CREATE POLICY "Center owners can view payment details"
ON payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM repair_jobs rj
    JOIN repair_center_staff rcs ON rcs.repair_center_id = rj.repair_center_id
    WHERE rj.id = payments.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_owner = true
    AND rcs.is_active = true
  )
);

-- Create limited view policy for non-owner staff (they can only confirm payment exists)
-- Note: RLS can't restrict columns, so application code should filter displayed data for non-owners
CREATE POLICY "Staff can verify payment exists"
ON payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM repair_jobs rj
    JOIN repair_center_staff rcs ON rcs.repair_center_id = rj.repair_center_id
    WHERE rj.id = payments.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_active = true
    AND rcs.is_owner = false
  )
);