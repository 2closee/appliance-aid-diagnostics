-- Allow repair center staff to update their branding
CREATE POLICY "Repair center staff can update their branding"
ON "Repair Center"
FOR UPDATE
TO authenticated
USING (is_staff_at_center(auth.uid(), id))
WITH CHECK (is_staff_at_center(auth.uid(), id));