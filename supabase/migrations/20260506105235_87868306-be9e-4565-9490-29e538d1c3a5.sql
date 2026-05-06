
-- 1) Fix repair_center_staff self-assignment privilege escalation
DROP POLICY IF EXISTS "Allow application staff creation" ON public.repair_center_staff;

CREATE POLICY "Admins can insert staff"
ON public.repair_center_staff
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2) Restrict teachers public SELECT to authenticated only (hides contact fields from anon)
DROP POLICY IF EXISTS "Public can view active teachers" ON public.teachers;

CREATE POLICY "Authenticated can view active teachers"
ON public.teachers
FOR SELECT
TO authenticated
USING (is_active = true);

-- 3) Fix enrollment_payments anonymous insert
DROP POLICY IF EXISTS "Allow public insert for enrollment payments" ON public.enrollment_payments;

CREATE POLICY "Users can insert own enrollment payments"
ON public.enrollment_payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_registrations sr
    WHERE sr.id = enrollment_payments.registration_id
      AND sr.user_id = auth.uid()
  )
);
