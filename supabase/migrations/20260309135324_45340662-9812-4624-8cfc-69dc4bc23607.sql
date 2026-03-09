
-- Create center_referrals table
CREATE TABLE public.center_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_center_id bigint NOT NULL REFERENCES public."Repair Center"(id) ON DELETE CASCADE,
  referred_center_id bigint REFERENCES public."Repair Center"(id) ON DELETE SET NULL,
  referred_email text NOT NULL,
  referred_business_name text NOT NULL,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'active', 'rewarded')),
  reward_type text DEFAULT 'commission_bonus' CHECK (reward_type IN ('commission_bonus', 'credit', 'featured_listing')),
  reward_amount numeric,
  reward_paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create center_referral_rewards table
CREATE TABLE public.center_referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.center_referrals(id) ON DELETE CASCADE,
  center_id bigint NOT NULL REFERENCES public."Repair Center"(id) ON DELETE CASCADE,
  reward_type text NOT NULL DEFAULT 'commission_bonus',
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add referral_code column to repair_center_applications
ALTER TABLE public.repair_center_applications ADD COLUMN IF NOT EXISTS referral_code text;

-- Enable RLS
ALTER TABLE public.center_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS for center_referrals: super_admin/admin sees all
CREATE POLICY "Admins can manage all referrals" ON public.center_referrals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Centers can view their own referrals
CREATE POLICY "Centers can view own referrals" ON public.center_referrals
  FOR SELECT TO authenticated
  USING (is_staff_at_center(auth.uid(), referring_center_id));

-- Centers can create referrals for their center
CREATE POLICY "Centers can create referrals" ON public.center_referrals
  FOR INSERT TO authenticated
  WITH CHECK (is_staff_at_center(auth.uid(), referring_center_id));

-- RLS for center_referral_rewards
CREATE POLICY "Admins can manage all rewards" ON public.center_referral_rewards
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Centers can view own rewards" ON public.center_referral_rewards
  FOR SELECT TO authenticated
  USING (is_staff_at_center(auth.uid(), center_id));
