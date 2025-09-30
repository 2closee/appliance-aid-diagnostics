-- Fix the infinite recursion by using a simpler approach
-- Drop all policies and recreate with a different strategy

-- Drop all existing policies on repair_center_staff
DROP POLICY IF EXISTS "Allow initial owner staff record creation" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Active owners can manage center staff" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Active admins can manage center staff" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Admins can create staff records" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Admins can update staff records" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Authenticated users can view staff records" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Global admins can manage all staff" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Staff can view own record" ON public.repair_center_staff;

-- Create simple, non-recursive policies

-- 1. Allow users to create their initial owner record during application
CREATE POLICY "Users can create own owner record" 
ON public.repair_center_staff 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND is_owner = true
);

-- 2. Allow global admins to manage all staff records
CREATE POLICY "Global admins manage all staff" 
ON public.repair_center_staff 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Allow users to view their own staff record
CREATE POLICY "Users view own staff record" 
ON public.repair_center_staff 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Allow all authenticated users to view staff records (for checking permissions)
CREATE POLICY "Authenticated users view staff records" 
ON public.repair_center_staff 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 5. Use a security definer function for owner management to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_center_owner(_user_id uuid, _center_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repair_center_staff
    WHERE user_id = _user_id 
    AND repair_center_id = _center_id
    AND is_owner = true
    AND is_active = true
  );
$$;

-- 6. Allow owners to manage staff using the security definer function
CREATE POLICY "Owners manage center staff via function" 
ON public.repair_center_staff 
FOR ALL 
USING (public.user_is_center_owner(auth.uid(), repair_center_id))
WITH CHECK (public.user_is_center_owner(auth.uid(), repair_center_id));