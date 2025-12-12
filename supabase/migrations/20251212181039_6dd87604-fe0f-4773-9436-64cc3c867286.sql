-- Fix email_logs INSERT policy
-- Issue: Any authenticated user can insert records, should be service role only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert email logs" ON email_logs;

-- Create new policy that blocks all client-side inserts
-- Email logs should ONLY be inserted by edge functions using service_role key
-- Since service_role bypasses RLS entirely, we create a deny-all policy for regular users
CREATE POLICY "No direct client inserts allowed"
ON email_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Note: Edge functions using SUPABASE_SERVICE_ROLE_KEY bypass RLS entirely,
-- so they can still insert records. This policy only blocks client-side inserts.