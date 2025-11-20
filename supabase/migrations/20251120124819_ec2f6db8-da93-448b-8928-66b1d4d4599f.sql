-- Phase 1: Add delivery cost tracking fields to delivery_requests
ALTER TABLE delivery_requests
ADD COLUMN IF NOT EXISTS cash_payment_status TEXT DEFAULT 'pending' CHECK (cash_payment_status IN ('pending', 'paid', 'confirmed', 'disputed')),
ADD COLUMN IF NOT EXISTS cash_payment_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cash_payment_confirmed_by TEXT,
ADD COLUMN IF NOT EXISTS app_delivery_commission NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN';

-- Make cost fields NOT NULL with default
ALTER TABLE delivery_requests
ALTER COLUMN estimated_cost SET DEFAULT 0,
ALTER COLUMN estimated_cost SET NOT NULL;

-- Create delivery_commissions table
CREATE TABLE IF NOT EXISTS delivery_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_request_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  repair_job_id UUID REFERENCES repair_jobs(id) ON DELETE SET NULL,
  delivery_cost NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,4) DEFAULT 0.05 NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'settled', 'disputed')),
  settlement_date TIMESTAMPTZ,
  settlement_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on delivery_commissions
ALTER TABLE delivery_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_commissions
CREATE POLICY "Admins can manage all delivery commissions"
  ON delivery_commissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Repair center staff can view their delivery commissions"
  ON delivery_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repair_jobs rj
      JOIN repair_center_staff rcs ON rj.repair_center_id = rcs.repair_center_id
      WHERE rj.id = delivery_commissions.repair_job_id
      AND rcs.user_id = auth.uid()
      AND rcs.is_active = true
    )
  );

-- Create function to calculate and store delivery commission
CREATE OR REPLACE FUNCTION calculate_and_store_delivery_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate 5% commission on actual cost
  IF NEW.actual_cost IS NOT NULL AND NEW.actual_cost > 0 THEN
    NEW.app_delivery_commission = NEW.actual_cost * 0.05;
    
    -- Insert or update commission record
    INSERT INTO delivery_commissions (
      delivery_request_id,
      repair_job_id,
      delivery_cost,
      commission_amount,
      commission_rate,
      status
    ) VALUES (
      NEW.id,
      NEW.repair_job_id,
      NEW.actual_cost,
      NEW.app_delivery_commission,
      0.05,
      CASE WHEN NEW.cash_payment_status = 'confirmed' THEN 'collected' ELSE 'pending' END
    )
    ON CONFLICT (delivery_request_id) DO UPDATE
    SET delivery_cost = EXCLUDED.delivery_cost,
        commission_amount = EXCLUDED.commission_amount,
        status = EXCLUDED.status,
        updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic commission calculation
DROP TRIGGER IF EXISTS calculate_delivery_commission_trigger ON delivery_requests;
CREATE TRIGGER calculate_delivery_commission_trigger
  AFTER INSERT OR UPDATE OF actual_cost ON delivery_requests
  FOR EACH ROW
  WHEN (NEW.actual_cost IS NOT NULL AND NEW.actual_cost > 0)
  EXECUTE FUNCTION calculate_and_store_delivery_commission();

-- Create function to update commission status when payment is confirmed
CREATE OR REPLACE FUNCTION update_delivery_commission_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cash_payment_status = 'confirmed' AND OLD.cash_payment_status != 'confirmed' THEN
    UPDATE delivery_commissions
    SET status = 'collected',
        updated_at = NOW()
    WHERE delivery_request_id = NEW.id;
  ELSIF NEW.cash_payment_status = 'disputed' THEN
    UPDATE delivery_commissions
    SET status = 'disputed',
        notes = 'Payment disputed by customer or driver',
        updated_at = NOW()
    WHERE delivery_request_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for commission status updates
DROP TRIGGER IF EXISTS update_commission_status_trigger ON delivery_requests;
CREATE TRIGGER update_commission_status_trigger
  AFTER UPDATE OF cash_payment_status ON delivery_requests
  FOR EACH ROW
  WHEN (NEW.cash_payment_status IS DISTINCT FROM OLD.cash_payment_status)
  EXECUTE FUNCTION update_delivery_commission_status();

-- Add unique constraint to ensure one commission record per delivery
ALTER TABLE delivery_commissions
ADD CONSTRAINT unique_delivery_commission UNIQUE (delivery_request_id);

-- Add updated_at trigger for delivery_commissions
DROP TRIGGER IF EXISTS update_delivery_commissions_updated_at ON delivery_commissions;
CREATE TRIGGER update_delivery_commissions_updated_at
  BEFORE UPDATE ON delivery_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_commissions_status ON delivery_commissions(status);
CREATE INDEX IF NOT EXISTS idx_delivery_commissions_repair_job ON delivery_commissions(repair_job_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_payment_status ON delivery_requests(cash_payment_status);