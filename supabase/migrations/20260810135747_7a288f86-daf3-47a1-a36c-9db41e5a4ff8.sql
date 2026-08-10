
-- 1. PRICING TIERS
CREATE TABLE public.protection_pricing_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_repair_cost NUMERIC NOT NULL,
  max_repair_cost NUMERIC,
  flat_fee NUMERIC,
  percentage_rate NUMERIC,
  fee_cap NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.protection_pricing_tiers TO authenticated;
GRANT ALL ON public.protection_pricing_tiers TO service_role;
ALTER TABLE public.protection_pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read active tiers" ON public.protection_pricing_tiers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tiers" ON public.protection_pricing_tiers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_protection_pricing_tiers_updated_at BEFORE UPDATE ON public.protection_pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. PLANS
CREATE TABLE public.repair_protection_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  repair_center_id BIGINT REFERENCES public."Repair Center"(id),
  device_category TEXT NOT NULL,
  repair_cost_at_purchase NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  claims_used INTEGER NOT NULL DEFAULT 0,
  max_claims INTEGER NOT NULL DEFAULT 2,
  accepted_terms_version TEXT NOT NULL DEFAULT 'v1.0',
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repair_job_id)
);
GRANT SELECT, INSERT, UPDATE ON public.repair_protection_plans TO authenticated;
GRANT ALL ON public.repair_protection_plans TO service_role;
ALTER TABLE public.repair_protection_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own plans" ON public.repair_protection_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Center staff view center plans" ON public.repair_protection_plans
  FOR SELECT TO authenticated USING (repair_center_id IS NOT NULL AND public.is_staff_at_center(auth.uid(), repair_center_id));
CREATE POLICY "Admins view all plans" ON public.repair_protection_plans
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage plans" ON public.repair_protection_plans
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_repair_protection_plans_updated_at BEFORE UPDATE ON public.repair_protection_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. CLAIMS
CREATE TABLE public.protection_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.repair_protection_plans(id) ON DELETE CASCADE,
  repair_job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  repair_center_id BIGINT REFERENCES public."Repair Center"(id),
  reported_fault TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted',
  center_response_notes TEXT,
  center_responded_at TIMESTAMPTZ,
  admin_notes TEXT,
  pickup_delivery_id UUID,
  return_delivery_id UUID,
  logistics_cost_paid NUMERIC NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.protection_claims TO authenticated;
GRANT ALL ON public.protection_claims TO service_role;
ALTER TABLE public.protection_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own claims" ON public.protection_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Customers create own claims" ON public.protection_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Center staff view center claims" ON public.protection_claims
  FOR SELECT TO authenticated USING (repair_center_id IS NOT NULL AND public.is_staff_at_center(auth.uid(), repair_center_id));
CREATE POLICY "Center staff respond to center claims" ON public.protection_claims
  FOR UPDATE TO authenticated USING (repair_center_id IS NOT NULL AND public.is_staff_at_center(auth.uid(), repair_center_id))
  WITH CHECK (repair_center_id IS NOT NULL AND public.is_staff_at_center(auth.uid(), repair_center_id));
CREATE POLICY "Admins view all claims" ON public.protection_claims
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage claims" ON public.protection_claims
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_protection_claims_updated_at BEFORE UPDATE ON public.protection_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. LEDGER
CREATE TABLE public.protection_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.repair_protection_plans(id) ON DELETE SET NULL,
  claim_id UUID REFERENCES public.protection_claims(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.protection_ledger TO authenticated;
GRANT ALL ON public.protection_ledger TO service_role;
ALTER TABLE public.protection_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view ledger" ON public.protection_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. AGREEMENT ACCEPTANCES
CREATE TABLE public.partner_agreement_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_center_id BIGINT NOT NULL REFERENCES public."Repair Center"(id) ON DELETE CASCADE,
  agreement_version TEXT NOT NULL,
  accepted_by UUID NOT NULL,
  accepted_full_name TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repair_center_id, agreement_version)
);
GRANT SELECT, INSERT ON public.partner_agreement_acceptances TO authenticated;
GRANT ALL ON public.partner_agreement_acceptances TO service_role;
ALTER TABLE public.partner_agreement_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center staff view own acceptances" ON public.partner_agreement_acceptances
  FOR SELECT TO authenticated USING (public.is_staff_at_center(auth.uid(), repair_center_id));
CREATE POLICY "Center staff record acceptance" ON public.partner_agreement_acceptances
  FOR INSERT TO authenticated WITH CHECK (public.is_staff_at_center(auth.uid(), repair_center_id) AND accepted_by = auth.uid());
CREATE POLICY "Admins view all acceptances" ON public.partner_agreement_acceptances
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. SEED TIERS
INSERT INTO public.protection_pricing_tiers (min_repair_cost, max_repair_cost, flat_fee, percentage_rate, fee_cap, sort_order) VALUES
  (0, 20000, 3000, NULL, NULL, 1),
  (20000.01, 35000, 3500, NULL, NULL, 2),
  (35000.01, 50000, 4500, NULL, NULL, 3),
  (50000.01, 100000, 6500, NULL, NULL, 4),
  (100000.01, NULL, NULL, 0.08, 15000, 5);
