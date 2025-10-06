-- Add explicit restrictive policy to deny all public access to repair_jobs
-- This ensures unauthenticated users cannot access sensitive customer data

-- Drop existing permissive policies and recreate as more explicit
DROP POLICY IF EXISTS "Users can view their own repair jobs" ON repair_jobs;
DROP POLICY IF EXISTS "Repair center staff can view jobs for their center" ON repair_jobs;
DROP POLICY IF EXISTS "Admins can view all repair jobs" ON repair_jobs;

-- Create new explicit SELECT policies that only allow authenticated users
CREATE POLICY "Authenticated users can view their own repair jobs"
ON repair_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated repair center staff can view jobs for their center"
ON repair_jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM repair_center_staff rcs
    WHERE rcs.user_id = auth.uid()
    AND rcs.repair_center_id = repair_jobs.repair_center_id
    AND rcs.is_active = true
  )
);

CREATE POLICY "Authenticated admins can view all repair jobs"
ON repair_jobs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add explicit restrictive policy to block all public access
CREATE POLICY "Block all public access to repair jobs"
ON repair_jobs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Ensure INSERT policies are also properly scoped to authenticated users
DROP POLICY IF EXISTS "Users can create their own repair jobs" ON repair_jobs;

CREATE POLICY "Authenticated users can create their own repair jobs"
ON repair_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure UPDATE policies are properly scoped
DROP POLICY IF EXISTS "Users can update their own repair jobs" ON repair_jobs;
DROP POLICY IF EXISTS "Repair center staff can update jobs for their center" ON repair_jobs;
DROP POLICY IF EXISTS "Admins can update all repair jobs" ON repair_jobs;

CREATE POLICY "Authenticated users can update their own repair jobs"
ON repair_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated repair center staff can update jobs for their center"
ON repair_jobs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM repair_center_staff rcs
    WHERE rcs.user_id = auth.uid()
    AND rcs.repair_center_id = repair_jobs.repair_center_id
    AND rcs.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM repair_center_staff rcs
    WHERE rcs.user_id = auth.uid()
    AND rcs.repair_center_id = repair_jobs.repair_center_id
    AND rcs.is_active = true
  )
);

CREATE POLICY "Authenticated admins can update all repair jobs"
ON repair_jobs
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure DELETE policy is properly scoped
DROP POLICY IF EXISTS "Admins can delete repair jobs" ON repair_jobs;

CREATE POLICY "Authenticated admins can delete repair jobs"
ON repair_jobs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));