-- Drop ALL existing policies on repair_center_applications to start fresh
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'repair_center_applications' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.repair_center_applications';
    END LOOP;
END $$;

-- Create production RLS policies for repair_center_applications

-- Allow public (anonymous and authenticated) to insert applications
CREATE POLICY "Allow anonymous quick application submissions"
ON public.repair_center_applications
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

CREATE POLICY "Allow authenticated quick application submissions"
ON public.repair_center_applications
FOR INSERT
TO authenticated
WITH CHECK (status = 'pending');

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.repair_center_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update applications (e.g., change status)
CREATE POLICY "Admins can update applications"
ON public.repair_center_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Grant admin privileges to the current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('ba52da2f-2cb7-4036-a934-d757c4352b6a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;