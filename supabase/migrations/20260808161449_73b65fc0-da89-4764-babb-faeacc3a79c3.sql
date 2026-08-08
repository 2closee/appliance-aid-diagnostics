CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  user_id uuid,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_verifications TO service_role;

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages phone verifications"
ON public.phone_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications (phone, created_at DESC);

CREATE TRIGGER update_phone_verifications_updated_at
BEFORE UPDATE ON public.phone_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;