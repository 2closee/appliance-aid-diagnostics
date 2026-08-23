ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE UNIQUE INDEX IF NOT EXISTS trip_offers_one_live_offer_per_trip
ON public.trip_offers (trip_id)
WHERE status = 'offered';

UPDATE public.overpass_pricing
SET offer_timeout_seconds = GREATEST(offer_timeout_seconds, 180),
    updated_at = now()
WHERE active = true;