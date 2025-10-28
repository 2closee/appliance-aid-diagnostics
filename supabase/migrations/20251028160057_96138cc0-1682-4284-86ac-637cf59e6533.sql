-- Add quote-related columns to repair_jobs table
ALTER TABLE repair_jobs 
ADD COLUMN IF NOT EXISTS quoted_cost numeric,
ADD COLUMN IF NOT EXISTS quote_provided_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS quote_notes text,
ADD COLUMN IF NOT EXISTS quote_response_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS quote_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cost_adjustment_reason text,
ADD COLUMN IF NOT EXISTS cost_adjustment_approved boolean,
ADD COLUMN IF NOT EXISTS diagnostic_conversation_id uuid REFERENCES diagnostic_conversations(id),
ADD COLUMN IF NOT EXISTS ai_diagnosis_summary text,
ADD COLUMN IF NOT EXISTS ai_confidence_score numeric,
ADD COLUMN IF NOT EXISTS ai_estimated_cost_min numeric,
ADD COLUMN IF NOT EXISTS ai_estimated_cost_max numeric,
ADD COLUMN IF NOT EXISTS diagnostic_attachments jsonb;

-- Extend job_status enum with new quote-related statuses
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_status' AND e.enumlabel = 'quote_requested') THEN
    ALTER TYPE job_status ADD VALUE 'quote_requested';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_status' AND e.enumlabel = 'quote_pending_review') THEN
    ALTER TYPE job_status ADD VALUE 'quote_pending_review';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_status' AND e.enumlabel = 'quote_accepted') THEN
    ALTER TYPE job_status ADD VALUE 'quote_accepted';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_status' AND e.enumlabel = 'quote_rejected') THEN
    ALTER TYPE job_status ADD VALUE 'quote_rejected';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_status' AND e.enumlabel = 'quote_negotiating') THEN
    ALTER TYPE job_status ADD VALUE 'quote_negotiating';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_status' AND e.enumlabel = 'quote_expired') THEN
    ALTER TYPE job_status ADD VALUE 'quote_expired';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_status' AND e.enumlabel = 'cost_adjustment_pending') THEN
    ALTER TYPE job_status ADD VALUE 'cost_adjustment_pending';
  END IF;
END $$;

-- Create trigger function to set quote deadline
CREATE OR REPLACE FUNCTION public.set_quote_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set 48-hour response deadline when quote is provided
  IF NEW.quoted_cost IS NOT NULL AND (OLD.quoted_cost IS NULL OR OLD.quoted_cost IS DISTINCT FROM NEW.quoted_cost) THEN
    NEW.quote_response_deadline = NOW() + INTERVAL '48 hours';
    NEW.quote_expires_at = NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for quote deadline
DROP TRIGGER IF EXISTS update_quote_deadline ON repair_jobs;
CREATE TRIGGER update_quote_deadline
BEFORE UPDATE ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_deadline();

-- Create indexes for quote-related queries
CREATE INDEX IF NOT EXISTS idx_repair_jobs_diagnostic_conversation ON repair_jobs(diagnostic_conversation_id) WHERE diagnostic_conversation_id IS NOT NULL;