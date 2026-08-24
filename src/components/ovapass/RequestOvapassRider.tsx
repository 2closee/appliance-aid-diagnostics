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
  required_capability: string | null;
  assignment_attempts: number | null;
  assigned_at: string | null;
  current_offer_expires_at?: string | null;
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
      .select("id, status, fee, distance_km, rider_id, pickup_otp, dropoff_otp, required_capability, assignment_attempts, assigned_at")
      .eq("repair_job_id", repairJobId)
      .eq("trip_type", tripType)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestTrip = (data?.[0] as TripSummary) ?? null;
    if (latestTrip) {
      const { data: offers } = await supabase
        .from("trip_offers")
        .select("expires_at")
        .eq("trip_id", latestTrip.id)
        .eq("status", "offered")
        .gt("expires_at", new Date().toISOString())
        .order("offered_at", { ascending: false })
        .limit(1);
      latestTrip.current_offer_expires_at = offers?.[0]?.expires_at ?? null;
    }
    setTrip(latestTrip);
    setLoading(false);
  };


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairJobId, tripType]);

  // Retry a searching pickup while this center card is open. This complements
  // rider-online retries and means the center need not repeatedly press a button.
  useEffect(() => {
    if (!trip || trip.status !== "searching" || trip.rider_id) return;
    const timer = window.setInterval(() => {
      void supabase.functions.invoke("overpass-assign", { body: { trip_id: trip.id } }).then(() => load());
    }, 90_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, trip?.status, trip?.rider_id]);

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
         description: (data as { assignment?: { assigned?: boolean } })?.assignment?.assigned
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

  const retryDispatch = async () => {
    if (!trip) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("overpass-assign", {
        body: { trip_id: trip.id },
      });
      if (error) throw error;
      const assignment = (data as { assignment?: { assigned?: boolean; reason?: string } })?.assignment;
      const assigned = Boolean(assignment?.assigned);
      toast({
        title: assigned ? "Rider notified" : "Still searching",
        description: assigned
          ? assignment?.reason ?? "The closest suitable rider has been offered this trip."
          : assignment?.reason ?? "No suitable vehicle is online nearby yet.",
      });
      await load();
    } catch (e) {
      toast({ title: "Could not search again", description: (e as Error).message, variant: "destructive" });
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
            ? "Ovapass is coordinating this delivery leg."
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
              <>
                <p className="text-xs text-muted-foreground">
                  {trip.current_offer_expires_at
                    ? "Offer sent — waiting for the rider to respond."
                    : trip.assignment_attempts
                      ? "The previous offer expired. Ovapass is retrying automatically."
                      : trip.required_capability === "bulky"
                        ? "Waiting for an approved bulky-capable vehicle nearby. Ovapass will alert the closest match automatically."
                        : "Waiting for an available nearby rider. Ovapass will alert the closest match automatically."}
                </p>
                <Button variant="outline" size="sm" className="w-full" onClick={retryDispatch} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Search again now
                </Button>
              </>
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
