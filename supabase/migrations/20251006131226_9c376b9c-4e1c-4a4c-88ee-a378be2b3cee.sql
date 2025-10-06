-- Remove unique constraint on phone to allow resubmissions
ALTER TABLE public.repair_center_applications 
DROP CONSTRAINT IF EXISTS repair_center_applications_phone_unique;

-- Ensure email has a unique constraint to prevent duplicate pending applications
ALTER TABLE public.repair_center_applications 
DROP CONSTRAINT IF EXISTS repair_center_applications_email_key;

-- Add a partial unique index on email for pending applications only
CREATE UNIQUE INDEX IF NOT EXISTS repair_center_applications_email_pending_unique 
ON public.repair_center_applications (email) 
WHERE status = 'pending';