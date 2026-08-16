import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bike, Phone } from "lucide-react";
import LiveTripMap from "@/components/ovapass/LiveTripMap";
import { useTripRiderPosition } from "@/hooks/useTripRiderPosition";

export interface TrackableTrip {
  id: string;
  status: string;
  trip_type: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
}

const ACTIVE = ["accepted", "en_route_to_pickup", "picked_up"];

/** Live rider map for customers and repair centers watching an Ovapass trip. */
const OvapassLiveTracking = ({ trip }: { trip: TrackableTrip }) => {
  const isActive = ACTIVE.includes(trip.status);
  const { position, isStale } = useTripRiderPosition(trip.id, isActive);

  if (!isActive) return null;

  const riderPosition =
    position?.lat != null && position?.lng != null
      ? { lat: Number(position.lat), lng: Number(position.lng) }
      : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bike className="h-5 w-5 text-primary" /> Live rider tracking
          </CardTitle>
          <Badge variant="secondary">{trip.status.replace(/_/g, " ")}</Badge>
        </div>
        <CardDescription>
          {trip.status === "picked_up"
            ? "Your device is with the rider and on the way."
            : "The rider is heading to the pickup point."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <LiveTripMap
          riderPosition={riderPosition}
          origin={{ lat: trip.pickup_lat, lng: trip.pickup_lng, address: trip.pickup_address, label: "Pickup" }}
          destination={{
            lat: trip.dropoff_lat,
            lng: trip.dropoff_lng,
            address: trip.dropoff_address,
            label: "Destination",
          }}
          target={trip.status === "picked_up" ? "destination" : "origin"}
          mode="watcher"
          height={280}
        />

        {!riderPosition && (
          <p className="text-sm text-muted-foreground">Waiting for the rider's location signal…</p>
        )}
        {riderPosition && isStale && (
          <p className="text-sm text-muted-foreground">
            Rider signal paused — showing their last known position.
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-medium">{position?.rider_name ?? "Ovapass rider"}</p>
            <p className="text-muted-foreground">
              {[position?.bike_make, position?.plate_number].filter(Boolean).join(" · ") || "FixBudi e-bike"}
            </p>
          </div>
          {position?.rider_phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${position.rider_phone}`}>
                <Phone className="mr-2 h-4 w-4" /> Call rider
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OvapassLiveTracking;
