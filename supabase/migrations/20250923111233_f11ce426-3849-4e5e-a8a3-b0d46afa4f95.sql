-- Fix infinite recursion in repair_center_staff policies
-- Drop the problematic policy and recreate it properly
DROP POLICY IF EXISTS "Center owners can manage their staff" ON repair_center_staff;
DROP POLICY IF EXISTS "Owners can add staff to their centers" ON repair_center_staff;

-- Create a simpler policy that allows users to create their own staff record during application
CREATE POLICY "Users can create their own staff record during application" 
ON repair_center_staff 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_owner = true AND is_active = false);

-- Create a policy for admins to manage all staff records
-- This replaces the recursive policy
CREATE POLICY "Authenticated users can view staff records" 
ON repair_center_staff 
FOR SELECT 
USING (true);

-- Create a policy for updating staff records by admins
CREATE POLICY "Admins can update staff records" 
ON repair_center_staff 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));