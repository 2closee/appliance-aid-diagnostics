import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bike, Loader2 } from "lucide-react";

interface Props {
  repairJobId: string;
  tripType?: "pickup" | "return";
}

interface TripSummary {
  id: string;
  status: string;
  fee: number | null;
  distance_km: number | null;
  rider_id: string | null;
  pickup_otp: string | null;
  dropoff_otp: string | null;
}

/** Lets repair center staff dispatch an Ovapass rider for a job. */
const RequestOvapassRider = ({ repairJobId, tripType = "pickup" }: Props) => {
  const { toast } = useToast();
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("overpass_trips")
      .select("id, status, fee, distance_km, rider_id, pickup_otp, dropoff_otp")
      .eq("repair_job_id", repairJobId)
      .eq("trip_type", tripType)
      .order("created_at", { ascending: false })
      .limit(1);
    setTrip((data?.[0] as TripSummary) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairJobId, tripType]);

  // Keep the card truthful as the trip moves from searching to offered/accepted.
  useEffect(() => {
    const channel = supabase
      .channel(`ovapass-job-${repairJobId}-${tripType}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "overpass_trips", filter: `repair_job_id=eq.${repairJobId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairJobId, tripType]);

  const dispatchRider = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("overpass-create-trip", {
        body: { repair_job_id: repairJobId, trip_type: tripType },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast({
        title: "Rider requested",
        description: (data as { assigned?: boolean })?.assigned
          ? "A rider has been offered the trip."
          : "We're searching for the nearest available rider.",
      });
      await load();
    } catch (e) {
      toast({ title: "Could not request a rider", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bike className="h-5 w-5 text-primary" /> Ovapass rider
        </CardTitle>
        <CardDescription>
          {trip
            ? "Our own rider fleet is handling this leg."
            : `Dispatch a FixBudi rider for this ${tripType === "pickup" ? "pickup" : "return"}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {trip ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>{trip.status.replace(/_/g, " ")}</Badge>
            </div>
            {trip.status === "searching" && !trip.rider_id && (
              <p className="text-xs text-muted-foreground">
                Waiting for an available nearby rider — we alert the closest one automatically and keep
                trying as riders come online.
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Delivery fee</span>
              <span className="font-medium">₦{Number(trip.fee ?? 0).toLocaleString()}</span>
            </div>
            {trip.distance_km ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Distance</span>
                <span className="font-medium">{Number(trip.distance_km).toFixed(1)} km</span>
              </div>
            ) : null}
            {(trip.pickup_otp || trip.dropoff_otp) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Handover code</span>
                <span className="font-mono text-base font-semibold tracking-widest">
                  {trip.status === "picked_up" ? trip.dropoff_otp : trip.pickup_otp}
                </span>
              </div>
            )}
            {["no_rider_found", "cancelled"].includes(trip.status) && (
              <Button className="w-full" onClick={dispatchRider} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Try another rider
              </Button>
            )}
          </div>
        ) : (
          <Button className="w-full" onClick={dispatchRider} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bike className="mr-2 h-4 w-4" />}
            Request an Ovapass rider
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestOvapassRider;
