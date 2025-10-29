-- Create repair center payouts table
CREATE TABLE public.repair_center_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_center_id BIGINT NOT NULL REFERENCES "Repair Center"(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  repair_job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
  
  -- Financial details
  gross_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  net_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  
  -- Payout status
  payout_status TEXT NOT NULL DEFAULT 'pending',
  payout_method TEXT,
  payout_reference TEXT,
  payout_date TIMESTAMP WITH TIME ZONE,
  
  -- Settlement period tracking
  settlement_period TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Add indexes for performance
CREATE INDEX idx_payouts_repair_center ON public.repair_center_payouts(repair_center_id);
CREATE INDEX idx_payouts_status ON public.repair_center_payouts(payout_status);
CREATE INDEX idx_payouts_settlement_period ON public.repair_center_payouts(settlement_period);
CREATE INDEX idx_payouts_payment_id ON public.repair_center_payouts(payment_id);

-- Enable RLS
ALTER TABLE public.repair_center_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all payouts"
  ON public.repair_center_payouts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Repair centers can view their own payouts"
  ON public.repair_center_payouts
  FOR SELECT
  USING (is_staff_at_center(auth.uid(), repair_center_id));

-- Trigger for updated_at
CREATE TRIGGER update_repair_center_payouts_updated_at
  BEFORE UPDATE ON public.repair_center_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to get settlement period (week-based)
CREATE OR REPLACE FUNCTION public.get_settlement_period(date_input TIMESTAMP WITH TIME ZONE)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT TO_CHAR(date_input, 'IYYY-"W"IW');
$$;