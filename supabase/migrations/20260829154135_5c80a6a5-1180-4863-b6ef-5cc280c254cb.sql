ALTER TABLE public.overpass_pricing
  ADD COLUMN IF NOT EXISTS max_search_radius_km NUMERIC NOT NULL DEFAULT 58,
  ADD COLUMN IF NOT EXISTS preferred_radius_km NUMERIC NOT NULL DEFAULT 7;

UPDATE public.overpass_pricing
SET preferred_radius_km = GREATEST(max_radius_km, 1),
    max_search_radius_km = GREATEST(max_search_radius_km, 58);

ALTER TABLE public.overpass_trips
  ADD COLUMN IF NOT EXISTS quoted_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS rate_vehicle_class TEXT;

UPDATE public.overpass_trips SET quoted_fee = fee WHERE quoted_fee IS NULL;

CREATE TABLE IF NOT EXISTS public.overpass_vehicle_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL DEFAULT 'Port Harcourt',
  vehicle_class TEXT NOT NULL,
  per_km NUMERIC NOT NULL DEFAULT 150,
  base_fare NUMERIC NOT NULL DEFAULT 800,
  min_fare NUMERIC NOT NULL DEFAULT 1000,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT overpass_vehicle_rates_class_check CHECK (vehicle_class IN ('bike','e_bike','car','suv','van','truck')),
  CONSTRAINT overpass_vehicle_rates_positive CHECK (per_km > 0 AND base_fare >= 0 AND min_fare >= 0),
  CONSTRAINT overpass_vehicle_rates_unique UNIQUE (city, vehicle_class)
);

GRANT SELECT ON public.overpass_vehicle_rates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.overpass_vehicle_rates TO authenticated;
GRANT ALL ON public.overpass_vehicle_rates TO service_role;

ALTER TABLE public.overpass_vehicle_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active vehicle rates"
ON public.overpass_vehicle_rates FOR SELECT
USING (active = true OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins manage vehicle rates"
ON public.overpass_vehicle_rates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_overpass_vehicle_rates_updated_at
BEFORE UPDATE ON public.overpass_vehicle_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.overpass_vehicle_rates (city, vehicle_class, per_km, base_fare, min_fare)
SELECT p.city, v.vehicle_class,
       round(p.per_km * v.mult), p.base_fare, p.min_fare
FROM public.overpass_pricing p
CROSS JOIN (VALUES
  ('bike', 1.0),
  ('e_bike', 1.0),
  ('car', 1.6),
  ('suv', 2.0),
  ('van', 2.4),
  ('truck', 3.0)
) AS v(vehicle_class, mult)
ON CONFLICT (city, vehicle_class) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dispatch_searching_ovapass_trips()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_rider record;
  v_pricing record;
  v_attempt integer;
  v_offer_id uuid;
  v_assigned integer := 0;
BEGIN
  UPDATE public.trip_offers
  SET status = 'expired', responded_at = now()
  WHERE status = 'offered' AND expires_at < now();

  SELECT coalesce(max_search_radius_km, 58) AS max_search_radius_km, offer_timeout_seconds
  INTO v_pricing
  FROM public.overpass_pricing
  WHERE active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_pricing IS NULL THEN RETURN 0; END IF;

  FOR v_trip IN
    SELECT t.*
    FROM public.overpass_trips t
    WHERE t.status IN ('pending', 'searching')
      AND t.rider_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.trip_offers o
        WHERE o.trip_id = t.id AND o.status = 'offered' AND o.expires_at > now()
      )
    ORDER BY t.created_at
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT candidate.* INTO v_rider
    FROM (
      SELECT r.*,
        CASE
          WHEN v_trip.pickup_lat IS NOT NULL AND v_trip.pickup_lng IS NOT NULL
            AND r.last_lat IS NOT NULL AND r.last_lng IS NOT NULL
          THEN 6371 * 2 * asin(sqrt(
            power(sin(radians((v_trip.pickup_lat - r.last_lat)::double precision) / 2), 2) +
            cos(radians(r.last_lat::double precision)) * cos(radians(v_trip.pickup_lat::double precision)) *
            power(sin(radians((v_trip.pickup_lng - r.last_lng)::double precision) / 2), 2)
          ))
          ELSE NULL
        END AS distance_km,
        CASE WHEN v_trip.required_capability <> 'bulky' AND r.fleet_type = 'company' THEN 0 ELSE 1 END AS fleet_rank
      FROM public.riders r
      WHERE r.settlement_blocked = false
        AND r.is_online = true
        AND r.is_available = true
        AND r.kyc_status = 'approved'
        AND r.carry_capability IN (
          CASE WHEN v_trip.required_capability = 'bulky' THEN 'bulky' ELSE 'gadget' END,
          'both'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.trip_offers prior
          WHERE prior.trip_id = v_trip.id
            AND prior.rider_id = r.id
            AND (
              prior.status = 'declined'
              OR (prior.status = 'expired' AND coalesce(prior.responded_at, prior.expires_at) > now() - interval '90 seconds')
            )
        )
    ) candidate
    WHERE (candidate.distance_km IS NOT NULL AND candidate.distance_km <= v_pricing.max_search_radius_km)
       OR (candidate.distance_km IS NULL AND v_trip.zone_id IS NOT NULL AND candidate.home_zone_id = v_trip.zone_id)
    ORDER BY candidate.fleet_rank, candidate.distance_km NULLS LAST, candidate.average_rating DESC NULLS LAST
    LIMIT 1;

    IF v_rider.id IS NULL THEN
      UPDATE public.overpass_trips SET status = 'searching' WHERE id = v_trip.id;
      CONTINUE;
    END IF;

    v_attempt := coalesce(v_trip.assignment_attempts, 0) + 1;
    INSERT INTO public.trip_offers (
      trip_id, rider_id, attempt_number, status, distance_to_pickup_km, expires_at
    ) VALUES (
      v_trip.id, v_rider.id, v_attempt, 'offered', v_rider.distance_km,
      now() + make_interval(secs => v_pricing.offer_timeout_seconds)
    )
    ON CONFLICT (trip_id) WHERE status = 'offered' DO NOTHING
    RETURNING id INTO v_offer_id;

    IF v_offer_id IS NULL THEN CONTINUE; END IF;

    UPDATE public.overpass_trips
    SET status = 'searching', assignment_attempts = v_attempt, assigned_at = now()
    WHERE id = v_trip.id;

    IF v_rider.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, title, message, type, related_entity_type, related_entity_id
      ) VALUES (
        v_rider.user_id,
        'New Ovapass ' || CASE WHEN v_trip.trip_type = 'return' THEN 'return' ELSE 'pickup' END || ' request',
        'New ' || CASE WHEN v_trip.trip_type = 'return' THEN 'return' ELSE 'pickup' END || ' request' ||
          CASE WHEN coalesce(v_trip.rider_earning, 0) > 0 THEN ' — you earn ₦' || trim(to_char(v_trip.rider_earning, 'FM999G999G990D00')) ELSE '' END ||
          '. Open Ovapass to accept.',
        'alert', 'ovapass_trip', v_trip.id
      );
    END IF;

    v_assigned := v_assigned + 1;
  END LOOP;

  RETURN v_assigned;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_searching_ovapass_trips() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_searching_ovapass_trips() TO service_role;