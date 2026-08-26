CREATE UNIQUE INDEX IF NOT EXISTS trip_offers_one_live_offer_per_trip
ON public.trip_offers (trip_id)
WHERE status = 'offered';

CREATE INDEX IF NOT EXISTS idx_overpass_trips_dispatch_queue
ON public.overpass_trips (status, rider_id, created_at)
WHERE rider_id IS NULL AND status IN ('pending', 'searching');

CREATE INDEX IF NOT EXISTS idx_overpass_trips_live_job_type
ON public.overpass_trips (repair_job_id, trip_type, created_at DESC)
WHERE status NOT IN ('completed', 'cancelled');