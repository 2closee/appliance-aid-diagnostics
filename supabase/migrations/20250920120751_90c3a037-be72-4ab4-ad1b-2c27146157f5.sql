-- Fix security vulnerability: Repair center staff should only access jobs for their center

-- Drop existing policies that have security issues
DROP POLICY IF EXISTS "Users and repair center staff can view relevant repair jobs" ON public.repair_jobs;
DROP POLICY IF EXISTS "Users, admins and repair center staff can update relevant repai" ON public.repair_jobs;

-- Create more secure and explicit policies

-- Policy 1: Users can view their own repair jobs
CREATE POLICY "Users can view their own repair jobs" 
ON public.repair_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Admins can view all repair jobs
CREATE POLICY "Admins can view all repair jobs" 
ON public.repair_jobs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy 3: Repair center staff can only view jobs for their assigned center
CREATE POLICY "Repair center staff can view jobs for their center" 
ON public.repair_jobs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.user_id = auth.uid() 
    AND rcs.repair_center_id = repair_jobs.repair_center_id
    AND rcs.is_active = true
  )
);

-- Policy 4: Users can update their own repair jobs
CREATE POLICY "Users can update their own repair jobs" 
ON public.repair_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy 5: Admins can update all repair jobs
CREATE POLICY "Admins can update all repair jobs" 
ON public.repair_jobs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy 6: Repair center staff can update jobs for their assigned center
CREATE POLICY "Repair center staff can update jobs for their center" 
ON public.repair_jobs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.user_id = auth.uid() 
    AND rcs.repair_center_id = repair_jobs.repair_center_id
    AND rcs.is_active = true
  )
);