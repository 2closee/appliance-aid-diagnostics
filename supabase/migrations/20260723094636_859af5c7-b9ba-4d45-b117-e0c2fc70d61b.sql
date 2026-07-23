
-- 1. Repair jobs: logistics category
ALTER TABLE public.repair_jobs
  ADD COLUMN IF NOT EXISTS logistics_category text CHECK (logistics_category IN ('gadget','bulky'));

-- 2. Delivery requests: OTP + provider tracking
ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS pickup_otp text,
  ADD COLUMN IF NOT EXISTS pickup_otp_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_otp text,
  ADD COLUMN IF NOT EXISTS return_otp_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS failover_from text,
  ADD COLUMN IF NOT EXISTS rider_name text,
  ADD COLUMN IF NOT EXISTS rider_phone text,
  ADD COLUMN IF NOT EXISTS rider_vehicle text;

-- 3. Delivery condition photos
CREATE TABLE IF NOT EXISTS public.delivery_condition_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_request_id uuid NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  repair_job_id uuid REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('pre_pickup','pre_return')),
  photo_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_condition_photos TO authenticated;
GRANT ALL ON public.delivery_condition_photos TO service_role;

ALTER TABLE public.delivery_condition_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can view own condition photos"
  ON public.delivery_condition_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = delivery_condition_photos.repair_job_id
      AND rj.user_id = auth.uid()
    )
  );

CREATE POLICY "Assigned center staff can view condition photos"
  ON public.delivery_condition_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = delivery_condition_photos.repair_job_id
      AND public.is_staff_at_center(auth.uid(), rj.repair_center_id)
    )
  );

CREATE POLICY "Admins view all condition photos"
  ON public.delivery_condition_photos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customer can insert own condition photos"
  ON public.delivery_condition_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = delivery_condition_photos.repair_job_id
      AND rj.user_id = auth.uid()
    )
  );

CREATE POLICY "Center staff can insert condition photos"
  ON public.delivery_condition_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = delivery_condition_photos.repair_job_id
      AND public.is_staff_at_center(auth.uid(), rj.repair_center_id)
    )
  );

-- 4. Logistics service zones
CREATE TABLE IF NOT EXISTS public.logistics_service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name text NOT NULL,
  city text NOT NULL,
  polygon_geojson jsonb,
  center_lat numeric,
  center_lng numeric,
  radius_km numeric DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  provider_priority text[] NOT NULL DEFAULT ARRAY['kwik','bolt','sendstack']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.logistics_service_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistics_service_zones TO authenticated;
GRANT ALL ON public.logistics_service_zones TO service_role;

ALTER TABLE public.logistics_service_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active zones"
  ON public.logistics_service_zones FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins manage zones"
  ON public.logistics_service_zones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_logistics_service_zones_updated_at
  BEFORE UPDATE ON public.logistics_service_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed PH pilot zones
INSERT INTO public.logistics_service_zones (zone_name, city, center_lat, center_lng, radius_km, provider_priority)
VALUES
  ('GRA Phase 2', 'Port Harcourt', 4.8156, 7.0498, 4, ARRAY['kwik','bolt','sendstack']),
  ('Rumuola', 'Port Harcourt', 4.8380, 7.0180, 4, ARRAY['kwik','bolt','sendstack']),
  ('Trans Amadi', 'Port Harcourt', 4.8010, 7.0500, 5, ARRAY['bolt','kwik','sendstack'])
ON CONFLICT DO NOTHING;

-- 5. Rider ratings
CREATE TABLE IF NOT EXISTS public.rider_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_request_id uuid NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  repair_job_id uuid REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  provider_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  professionalism int CHECK (professionalism BETWEEN 1 AND 5),
  punctuality int CHECK (punctuality BETWEEN 1 AND 5),
  comment text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (delivery_request_id, created_by)
);

GRANT SELECT, INSERT ON public.rider_ratings TO authenticated;
GRANT ALL ON public.rider_ratings TO service_role;

ALTER TABLE public.rider_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can insert rating"
  ON public.rider_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = rider_ratings.repair_job_id
      AND rj.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can view own rating"
  ON public.rider_ratings FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Assigned center staff can view rating"
  ON public.rider_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = rider_ratings.repair_job_id
      AND public.is_staff_at_center(auth.uid(), rj.repair_center_id)
    )
  );

CREATE POLICY "Admins view all ratings"
  ON public.rider_ratings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));
