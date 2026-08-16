import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OvapassLiveTracking, { TrackableTrip } from "@/components/ovapass/OvapassLiveTracking";

const ACTIVE = ["accepted", "en_route_to_pickup", "picked_up"];

/** Finds the in-progress Ovapass trip for a repair job and shows live tracking. */
const OvapassJobTracking = ({ repairJobId }: { repairJobId: string }) => {
  const [trip, setTrip] = useState<TrackableTrip | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("overpass_trips")
        .select(
          "id, status, trip_type, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng",
        )
        .eq("repair_job_id", repairJobId)
        .in("status", ACTIVE)
        .order("created_at", { ascending: false })
        .limit(1);
      if (active) setTrip((data?.[0] as TrackableTrip) ?? null);
    };

    load();

    const channel = supabase
      .channel(`ovapass-job-trip-${repairJobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "overpass_trips", filter: `repair_job_id=eq.${repairJobId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [repairJobId]);

  if (!trip) return null;

  return <OvapassLiveTracking trip={trip} />;
};

export default OvapassJobTracking;
