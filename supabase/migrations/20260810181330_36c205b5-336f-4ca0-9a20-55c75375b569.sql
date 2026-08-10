ALTER TABLE public.overpass_pricing
  ADD COLUMN IF NOT EXISTS rider_share_company NUMERIC NOT NULL DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS max_unsettled_trips INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_unsettled_amount NUMERIC NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS payout_day INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_withdrawal NUMERIC NOT NULL DEFAULT 2000;

UPDATE public.overpass_pricing SET commission_rate_partner = 0.30 WHERE commission_rate_partner = 0.20;
UPDATE public.overpass_pricing SET commission_rate_company = 0.50 WHERE commission_rate_company >= 1;

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS settlement_blocked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.rider_ledger
  ADD COLUMN IF NOT EXISTS settlement_period TEXT;

CREATE TABLE IF NOT EXISTS public.rider_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  settlement_period TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'requested',
  bank_details TEXT,
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (rider_id, settlement_period)
);

GRANT SELECT, INSERT ON public.rider_payouts TO authenticated;
GRANT ALL ON public.rider_payouts TO service_role;

ALTER TABLE public.rider_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders view their own payouts"
ON public.rider_payouts FOR SELECT TO authenticated
USING (rider_id = public.get_rider_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Riders request their own payouts"
ON public.rider_payouts FOR INSERT TO authenticated
WITH CHECK (rider_id = public.get_rider_id(auth.uid()));

CREATE POLICY "Admins manage payouts"
ON public.rider_payouts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_rider_payouts_updated_at
BEFORE UPDATE ON public.rider_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();