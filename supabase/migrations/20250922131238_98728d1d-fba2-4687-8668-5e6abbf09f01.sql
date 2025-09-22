-- Fix infinite recursion in repair_center_staff policies
-- First, drop all existing policies on repair_center_staff to start fresh
DROP POLICY IF EXISTS "Admins can manage all repair center staff" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Repair center admins can manage their staff" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Repair center admins can manage staff at their center" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Staff can view their own record" ON public.repair_center_staff;

-- Create a safe function to check if user is repair center admin for a specific center
CREATE OR REPLACE FUNCTION public.is_repair_center_admin(_user_id uuid, _repair_center_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.user_id = _user_id 
    AND rcs.repair_center_id = _repair_center_id 
    AND rcs.role = 'admin'
    AND rcs.is_active = true
  );
$$;

-- Now create simple, non-recursive policies
-- Policy 1: Global admins can manage all staff records
CREATE POLICY "Global admins can manage all staff" 
ON public.repair_center_staff 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy 2: Staff can view their own record
CREATE POLICY "Staff can view own record" 
ON public.repair_center_staff 
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 3: Allow insert for new staff (controlled by application logic)
CREATE POLICY "Allow staff record creation" 
ON public.repair_center_staff 
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);