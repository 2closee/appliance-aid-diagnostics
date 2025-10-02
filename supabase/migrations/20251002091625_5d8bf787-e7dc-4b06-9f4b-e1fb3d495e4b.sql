-- Add unique constraint on email to prevent duplicates in repair_center_applications
ALTER TABLE public.repair_center_applications 
ADD CONSTRAINT repair_center_applications_email_unique UNIQUE (email);

-- Add unique constraint on phone to prevent duplicates in repair_center_applications
ALTER TABLE public.repair_center_applications 
ADD CONSTRAINT repair_center_applications_phone_unique UNIQUE (phone);

-- Add unique constraint on email to prevent duplicates in "Repair Center" table
ALTER TABLE public."Repair Center" 
ADD CONSTRAINT repair_center_email_unique UNIQUE (email);

-- Add unique constraint on phone to prevent duplicates in "Repair Center" table
ALTER TABLE public."Repair Center" 
ADD CONSTRAINT repair_center_phone_unique UNIQUE (phone);

-- Ensure "Repair Center" table accepts applications from anyone during quick signup
-- Drop any restrictive policies
DROP POLICY IF EXISTS "Anyone can submit repair center applications" ON public."Repair Center";

-- Create policy for anonymous quick applications (status = 'pending')
CREATE POLICY "Allow anonymous quick application submissions"
ON public."Repair Center"
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

-- Create policy for authenticated quick applications
CREATE POLICY "Allow authenticated quick application submissions"
ON public."Repair Center"
FOR INSERT
TO authenticated
WITH CHECK (status = 'pending');