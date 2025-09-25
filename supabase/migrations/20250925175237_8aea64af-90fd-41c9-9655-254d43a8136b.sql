-- Fix RLS policy for repair center applications
-- The current policy requires auth.uid() IS NOT NULL but new users aren't authenticated yet during signup

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create repair center applications" ON public."Repair Center";

-- Create a new policy that allows anyone to create a repair center application
-- This is safe because the status defaults to 'pending' and requires admin approval
CREATE POLICY "Anyone can submit repair center applications" 
ON public."Repair Center" 
FOR INSERT 
WITH CHECK (status = 'pending');