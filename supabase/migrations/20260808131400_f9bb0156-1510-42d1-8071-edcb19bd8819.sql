ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rider';

CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  fleet_type TEXT NOT NULL DEFAULT 'partner',
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  kyc_notes TEXT,
  bike_make TEXT,
  plate_number TEXT,
  id_doc_url TEXT,
  bike_photo_url TEXT,
  selfie_url TEXT,
  guarantor_name TEXT,
  guarantor_phone TEXT,
  home_zone_id UUID REFERENCES public.logistics_service_zones(id) ON DELETE SET NULL,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  last_lat NUMERIC,
  last_lng NUMERIC,
  last_ping_at TIMESTAMPTZ,
  average_rating NUMERIC DEFAULT 0,
  total_trips INTEGER NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.riders TO authenticated;
GRANT ALL ON public.riders TO service_role;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_rider_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.riders WHERE user_id = _user_id LIMIT 1 $$;

CREATE POLICY "Riders view own profile" ON public.riders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Riders create own profile" ON public.riders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Riders update own profile" ON public.riders
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete riders" ON public.riders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_riders_online ON public.riders(is_online, is_available, kyc_status);
CREATE INDEX idx_riders_zone ON public.riders(home_zone_id);

CREATE TABLE public.rider_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  accuracy_m NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rider_locations TO authenticated;
GRANT ALL ON public.rider_locations TO service_role;
ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders insert own location" ON public.rider_locations
  FOR INSERT TO authenticated WITH CHECK (rider_id = public.get_rider_id(auth.uid()));
CREATE POLICY "Riders and admins view locations" ON public.rider_locations
  FOR SELECT TO authenticated USING (rider_id = public.get_rider_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_rider_locations_rider ON public.rider_locations(rider_id, recorded_at DESC);

CREATE TABLE public.overpass_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'NGN',
  base_fare NUMERIC NOT NULL DEFAULT 800,
  per_km NUMERIC NOT NULL DEFAULT 150,
  min_fare NUMERIC NOT NULL DEFAULT 1000,
  bulky_surcharge NUMERIC NOT NULL DEFAULT 0,
  after_hours_surcharge NUMERIC NOT NULL DEFAULT 300,
  after_hours_start INTEGER NOT NULL DEFAULT 19,
  after_hours_end INTEGER NOT NULL DEFAULT 7,
  commission_rate_partner NUMERIC NOT NULL DEFAULT 0.20,
  commission_rate_company NUMERIC NOT NULL DEFAULT 1.00,
  max_radius_km NUMERIC NOT NULL DEFAULT 7,
  offer_timeout_seconds INTEGER NOT NULL DEFAULT 60,
  max_assignment_attempts INTEGER NOT NULL DEFAULT 4,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.overpass_pricing TO authenticated;
GRANT ALL ON public.overpass_pricing TO service_role;
ALTER TABLE public.overpass_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view pricing" ON public.overpass_pricing
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage pricing" ON public.overpass_pricing
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_overpass_pricing_updated_at BEFORE UPDATE ON public.overpass_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.overpass_pricing (city) VALUES ('Port Harcourt');

CREATE TABLE public.overpass_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  delivery_request_id UUID REFERENCES public.delivery_requests(id) ON DELETE SET NULL,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  trip_type TEXT NOT NULL DEFAULT 'pickup',
  status TEXT NOT NULL DEFAULT 'pending',
  zone_id UUID REFERENCES public.logistics_service_zones(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  dropoff_address TEXT NOT NULL,
  dropoff_lat NUMERIC,
  dropoff_lng NUMERIC,
  customer_name TEXT,
  customer_phone TEXT,
  distance_km NUMERIC,
  fee NUMERIC,
  currency TEXT NOT NULL DEFAULT 'NGN',
  commission_rate NUMERIC,
  commission_amount NUMERIC,
  rider_earning NUMERIC,
  pickup_otp TEXT,
  pickup_otp_verified_at TIMESTAMPTZ,
  dropoff_otp TEXT,
  dropoff_otp_verified_at TIMESTAMPTZ,
  assignment_attempts INTEGER NOT NULL DEFAULT 0,
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.overpass_trips TO authenticated;
GRANT ALL ON public.overpass_trips TO service_role;
ALTER TABLE public.overpass_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip visibility" ON public.overpass_trips
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR rider_id = public.get_rider_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = overpass_trips.repair_job_id
        AND (rj.user_id = auth.uid() OR public.is_staff_at_center(auth.uid(), rj.repair_center_id))
    )
  );

CREATE POLICY "Staff and admins create trips" ON public.overpass_trips
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = overpass_trips.repair_job_id
        AND public.is_staff_at_center(auth.uid(), rj.repair_center_id)
    )
  );

CREATE POLICY "Assigned rider staff admin update trips" ON public.overpass_trips
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR rider_id = public.get_rider_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.repair_jobs rj
      WHERE rj.id = overpass_trips.repair_job_id
        AND public.is_staff_at_center(auth.uid(), rj.repair_center_id)
    )
  );

CREATE TRIGGER update_overpass_trips_updated_at BEFORE UPDATE ON public.overpass_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_overpass_trips_status ON public.overpass_trips(status);
CREATE INDEX idx_overpass_trips_rider ON public.overpass_trips(rider_id);
CREATE INDEX idx_overpass_trips_job ON public.overpass_trips(repair_job_id);

CREATE TABLE public.trip_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.overpass_trips(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'offered',
  distance_to_pickup_km NUMERIC,
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '60 seconds'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.trip_offers TO authenticated;
GRANT ALL ON public.trip_offers TO service_role;
ALTER TABLE public.trip_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders view own offers" ON public.trip_offers
  FOR SELECT TO authenticated USING (rider_id = public.get_rider_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Riders respond to own offers" ON public.trip_offers
  FOR UPDATE TO authenticated USING (rider_id = public.get_rider_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_trip_offers_updated_at BEFORE UPDATE ON public.trip_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_trip_offers_rider_status ON public.trip_offers(rider_id, status);
CREATE INDEX idx_trip_offers_trip ON public.trip_offers(trip_id);

CREATE POLICY "Offered riders view trip" ON public.overpass_trips
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.trip_offers o
      WHERE o.trip_id = overpass_trips.id
        AND o.rider_id = public.get_rider_id(auth.uid())
    )
  );

CREATE TABLE public.rider_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.overpass_trips(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  description TEXT,
  settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  settled_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rider_ledger TO authenticated;
GRANT ALL ON public.rider_ledger TO service_role;
ALTER TABLE public.rider_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders view own ledger" ON public.rider_ledger
  FOR SELECT TO authenticated USING (rider_id = public.get_rider_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage ledger" ON public.rider_ledger
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_rider_ledger_updated_at BEFORE UPDATE ON public.rider_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rider_ledger_rider ON public.rider_ledger(rider_id, settled);

ALTER PUBLICATION supabase_realtime ADD TABLE public.overpass_trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
