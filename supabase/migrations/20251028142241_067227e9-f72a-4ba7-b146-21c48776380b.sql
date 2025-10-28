-- Add payment enforcement fields to repair_jobs table
ALTER TABLE public.repair_jobs
ADD COLUMN IF NOT EXISTS payment_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS deposit_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2);

-- Add index on payment_deadline for efficient queries
CREATE INDEX IF NOT EXISTS idx_repair_jobs_payment_deadline ON public.repair_jobs(payment_deadline);

-- Create function to automatically set payment deadline when job status changes to repair_completed
CREATE OR REPLACE FUNCTION public.set_payment_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status changes to repair_completed, set payment deadline to 7 days from now
  IF NEW.job_status = 'repair_completed' AND OLD.job_status IS DISTINCT FROM 'repair_completed' THEN
    NEW.payment_deadline = NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set payment deadline
DROP TRIGGER IF EXISTS trigger_set_payment_deadline ON public.repair_jobs;
CREATE TRIGGER trigger_set_payment_deadline
  BEFORE UPDATE ON public.repair_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_payment_deadline();