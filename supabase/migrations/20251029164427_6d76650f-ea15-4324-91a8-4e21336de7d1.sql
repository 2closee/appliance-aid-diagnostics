-- Create payout settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default payout settings
INSERT INTO public.payout_settings (key, value) VALUES
  ('payout_frequency', '{"type": "weekly", "day": 1}'::jsonb),
  ('minimum_threshold', '{"amount": 5000, "currency": "NGN"}'::jsonb),
  ('auto_process', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create dispute status enum
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved', 'rejected');

-- Add dispute management fields to repair_center_payouts
ALTER TABLE public.repair_center_payouts
ADD COLUMN IF NOT EXISTS dispute_status public.dispute_status,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_notes TEXT,
ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disputed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Enable RLS on payout_settings
ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payout_settings
CREATE POLICY "Admins can manage payout settings"
ON public.payout_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view payout settings"
ON public.payout_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.repair_center_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Add trigger to update updated_at
CREATE TRIGGER update_payout_settings_updated_at
  BEFORE UPDATE ON public.payout_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();