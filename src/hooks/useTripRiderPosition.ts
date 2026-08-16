import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TripRiderPosition {
  trip_id: string;
  status: string;
  rider_name: string | null;
  bike_make: string | null;
  plate_number: string | null;
  rider_phone: string | null;
  lat: number | null;
  lng: number | null;
  updated_at: string | null;
}

const POLL_MS = 10000;
const STALE_MS = 2 * 60 * 1000;

/**
 * Live rider position for a trip, readable only by the job's customer,
 * the center staff, the assigned rider and admins (enforced in the database).
 */
export function useTripRiderPosition(tripId?: string | null, enabled = true) {
  const [position, setPosition] = useState<TripRiderPosition | null>(null);
  const [isLoading, setIsLoading] = useState(!!tripId);

  const load = useCallback(async () => {
    if (!tripId) return;
    const { data } = await supabase.rpc("get_trip_rider_position", { _trip_id: tripId });
    const row = (data as TripRiderPosition[] | null)?.[0] ?? null;
    setPosition(row);
    setIsLoading(false);
  }, [tripId]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setPosition(null);
      setIsLoading(false);
      return;
    }
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [tripId, enabled, load]);

  const isStale =
    !position?.updated_at || Date.now() - new Date(position.updated_at).getTime() > STALE_MS;

  return { position, isLoading, isStale, reload: load };
}
