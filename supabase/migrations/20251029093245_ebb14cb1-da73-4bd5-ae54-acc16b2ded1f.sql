-- Update all existing jobs with quote_accepted status to requested
-- This enables them to progress through the sequential workflow
UPDATE public.repair_jobs
SET 
  job_status = 'requested',
  quote_accepted_at = updated_at  -- Preserve the time they accepted
WHERE job_status = 'quote_accepted';