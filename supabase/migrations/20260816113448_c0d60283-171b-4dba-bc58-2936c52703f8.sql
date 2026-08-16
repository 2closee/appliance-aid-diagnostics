CREATE OR REPLACE FUNCTION public.get_trip_rider_position(_trip_id uuid)
RETURNS TABLE(
  trip_id uuid,
  status text,
  rider_name text,
  bike_make text,
  plate_number text,
  rider_phone text,
  lat numeric,
  lng numeric,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.overpass_trips t
    LEFT JOIN public.repair_jobs rj ON rj.id = t.repair_job_id
    WHERE t.id = _trip_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR t.rider_id = get_rider_id(auth.uid())
        OR rj.user_id = auth.uid()
        OR is_staff_at_center(auth.uid(), rj.repair_center_id)
      )
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.status,
    split_part(COALESCE(r.full_name, 'Rider'), ' ', 1),
    r.bike_make,
    r.plate_number,
    CASE WHEN t.status IN ('accepted','en_route_to_pickup','picked_up') THEN r.phone ELSE NULL END,
    r.last_lat,
    r.last_lng,
    r.last_ping_at
  FROM public.overpass_trips t
  JOIN public.riders r ON r.id = t.rider_id
  WHERE t.id = _trip_id
    AND t.status IN ('accepted','en_route_to_pickup','picked_up');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trip_rider_position(uuid) TO authenticated;