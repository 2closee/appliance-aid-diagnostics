DROP FUNCTION IF EXISTS public.queue_ovapass_dispatch_retries();

CREATE TABLE IF NOT EXISTS public.ovapass_dispatch_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.overpass_trips(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_message text
);
GRANT ALL ON public.ovapass_dispatch_queue TO service_role;
ALTER TABLE public.ovapass_dispatch_queue ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS ovapass_dispatch_queue_one_pending_per_trip
ON public.ovapass_dispatch_queue (trip_id)
WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.queue_ovapass_dispatch_retries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  queued_count integer := 0;
BEGIN
  UPDATE public.trip_offers
  SET status = 'expired', responded_at = now()
  WHERE status = 'offered' AND expires_at < now();

  INSERT INTO public.ovapass_dispatch_queue (trip_id)
  SELECT t.id
  FROM public.overpass_trips t
  WHERE t.status IN ('pending', 'searching')
    AND t.rider_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.trip_offers o
      WHERE o.trip_id = t.id AND o.status = 'offered' AND o.expires_at > now()
    )
    AND EXISTS (
      SELECT 1
      FROM public.riders r
      CROSS JOIN public.overpass_pricing p
      WHERE p.active = true
        AND r.settlement_blocked = false
        AND r.is_online = true
        AND r.is_available = true
        AND r.kyc_status = 'approved'
        AND r.last_ping_at >= now() - interval '10 minutes'
        AND r.carry_capability IN (
          CASE WHEN t.required_capability = 'bulky' THEN 'bulky' ELSE 'gadget' END,
          'both'
        )
        AND (
          (t.pickup_lat IS NOT NULL AND t.pickup_lng IS NOT NULL AND r.last_lat IS NOT NULL AND r.last_lng IS NOT NULL
            AND 6371 * 2 * asin(sqrt(
              power(sin(radians((t.pickup_lat - r.last_lat)::double precision) / 2), 2) +
              cos(radians(r.last_lat::double precision)) * cos(radians(t.pickup_lat::double precision)) *
              power(sin(radians((t.pickup_lng - r.last_lng)::double precision) / 2), 2)
            )) <= p.max_radius_km)
          OR (t.zone_id IS NOT NULL AND r.home_zone_id = t.zone_id)
        )
    )
  ON CONFLICT (trip_id) WHERE status = 'pending' DO NOTHING;

  GET DIAGNOSTICS queued_count = ROW_COUNT;
  RETURN queued_count;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_ovapass_dispatch_retries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_ovapass_dispatch_retries() TO service_role;

SELECT cron.unschedule('ovapass-retry-searching-trips');
SELECT cron.schedule(
  'ovapass-queue-dispatch-retries',
  '* * * * *',
  $$SELECT public.queue_ovapass_dispatch_retries();$$
);