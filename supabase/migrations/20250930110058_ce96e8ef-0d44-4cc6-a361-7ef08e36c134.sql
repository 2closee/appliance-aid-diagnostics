-- Final fix: Drop ALL policies and create simple working policies
DROP POLICY "Owners manage center staff via function" ON public.repair_center_staff;
DROP POLICY "Users can create own owner record" ON public.repair_center_staff;
DROP POLICY "Global admins manage all staff" ON public.repair_center_staff;
DROP POLICY "Users view own staff record" ON public.repair_center_staff;
DROP POLICY "Authenticated users view staff records" ON public.repair_center_staff;

-- Phase 5: Add better error handling by improving the application submission process
-- Create SIMPLE policies that work without recursion

-- 1. Allow authenticated users to create initial staff records (for applications)
CREATE POLICY "Allow application staff creation" 
ON public.repair_center_staff 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Allow global admins to manage everything
CREATE POLICY "Admins manage all staff" 
ON public.repair_center_staff 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Allow users to view their own records
CREATE POLICY "View own staff record" 
ON public.repair_center_staff 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Allow viewing staff records for center operations (no recursion)
CREATE POLICY "View staff records for operations" 
ON public.repair_center_staff 
FOR SELECT 
USING (auth.uid() IS NOT NULL);