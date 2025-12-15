-- Create warranty type enum
CREATE TYPE public.warranty_type AS ENUM ('standard', 'extended', 'premium');

-- Create repair warranties table
CREATE TABLE public.repair_warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  warranty_type warranty_type NOT NULL DEFAULT 'standard',
  warranty_period_days INTEGER NOT NULL DEFAULT 30,
  warranty_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  warranty_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  claim_count INTEGER NOT NULL DEFAULT 0,
  max_claims INTEGER NOT NULL DEFAULT 1,
  terms_text TEXT,
  covered_issues TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(repair_job_id)
);

-- Enable RLS
ALTER TABLE public.repair_warranties ENABLE ROW LEVEL SECURITY;

-- Customers can view warranties for their jobs
CREATE POLICY "Customers can view their warranties"
ON public.repair_warranties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    WHERE rj.id = repair_warranties.repair_job_id
    AND rj.user_id = auth.uid()
  )
);

-- Repair center staff can view warranties for their jobs
CREATE POLICY "Staff can view center warranties"
ON public.repair_warranties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    JOIN public.repair_center_staff rcs ON rcs.repair_center_id = rj.repair_center_id
    WHERE rj.id = repair_warranties.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_active = true
  )
);

-- Admins can manage all warranties
CREATE POLICY "Admins can manage warranties"
ON public.repair_warranties FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- System can create warranties (via edge function)
CREATE POLICY "System can create warranties"
ON public.repair_warranties FOR INSERT
WITH CHECK (true);

-- Create warranty claims table
CREATE TABLE public.warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES public.repair_warranties(id) ON DELETE CASCADE,
  repair_job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  claim_reason TEXT NOT NULL,
  claim_description TEXT,
  claim_status TEXT NOT NULL DEFAULT 'pending',
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

-- Customers can view and create claims for their warranties
CREATE POLICY "Customers can view their claims"
ON public.warranty_claims FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    WHERE rj.id = warranty_claims.repair_job_id
    AND rj.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can create claims"
ON public.warranty_claims FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    WHERE rj.id = warranty_claims.repair_job_id
    AND rj.user_id = auth.uid()
  )
);

-- Staff can view and update claims for their center
CREATE POLICY "Staff can view center claims"
ON public.warranty_claims FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    JOIN public.repair_center_staff rcs ON rcs.repair_center_id = rj.repair_center_id
    WHERE rj.id = warranty_claims.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_active = true
  )
);

CREATE POLICY "Staff can update center claims"
ON public.warranty_claims FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    JOIN public.repair_center_staff rcs ON rcs.repair_center_id = rj.repair_center_id
    WHERE rj.id = warranty_claims.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_active = true
  )
);

-- Admins can manage all claims
CREATE POLICY "Admins can manage claims"
ON public.warranty_claims FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for auto-creating warranty after payment completion
CREATE OR REPLACE FUNCTION public.create_warranty_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create warranty when payment is completed and it's for repair service
  IF NEW.payment_status = 'completed' AND NEW.payment_type = 'repair_service' THEN
    -- Check if warranty doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM repair_warranties WHERE repair_job_id = NEW.repair_job_id) THEN
      INSERT INTO repair_warranties (
        repair_job_id,
        warranty_type,
        warranty_period_days,
        warranty_start_date,
        warranty_end_date,
        terms_text,
        covered_issues
      ) VALUES (
        NEW.repair_job_id,
        'standard',
        30,
        NOW(),
        NOW() + INTERVAL '30 days',
        'This warranty covers the same issue that was repaired. If the problem recurs within the warranty period, FixBudi will coordinate a free re-repair with the repair center.',
        ARRAY['Same issue recurrence', 'Parts failure from repair', 'Workmanship defects']
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_warranty_after_payment
AFTER UPDATE ON public.payments
FOR EACH ROW
WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION public.create_warranty_on_payment();

-- Update timestamps trigger for warranties
CREATE TRIGGER update_repair_warranties_updated_at
BEFORE UPDATE ON public.repair_warranties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps trigger for warranty claims
CREATE TRIGGER update_warranty_claims_updated_at
BEFORE UPDATE ON public.warranty_claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();