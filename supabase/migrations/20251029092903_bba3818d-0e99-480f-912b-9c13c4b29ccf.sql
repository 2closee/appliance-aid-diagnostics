-- Add quote_accepted_at timestamp to repair_jobs table
ALTER TABLE public.repair_jobs
ADD COLUMN quote_accepted_at timestamp with time zone;