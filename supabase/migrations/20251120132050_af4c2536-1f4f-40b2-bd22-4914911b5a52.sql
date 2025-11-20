-- Add quote_accepted to job_status enum if not already present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'quote_accepted' 
    AND enumtypid = 'job_status'::regtype
  ) THEN
    ALTER TYPE job_status ADD VALUE 'quote_accepted' AFTER 'quote_requested';
  END IF;
END $$;