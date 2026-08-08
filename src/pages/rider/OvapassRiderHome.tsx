import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRider } from "@/hooks/useRider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Bike, Clock, Loader2, MapPin, Navigation, Phone, Wallet } from "lucide-react";

const formatMoney = (amount: number | null | undefined, currency = "NGN") =>
  `${currency === "NGN" ? "₦" : `${currency} `}${Number(amount ?? 0).toLocaleString()}`;

const OvapassRiderHome = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { rider, offer, offerTrip, activeTrip, isLoading, setOnline, respondToOffer, updateTrip } = useRider();

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!offer) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(offer.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [offer]);

  const nextAction = useMemo(() => {
    if (!activeTrip) return null;
    if (activeTrip.status === "accepted") return { action: "en_route", label: "Start riding to pickup" };
    if (activeTrip.status === "en_route_to_pickup") return { action: "verify_pickup", label: "Collect device", needsOtp: true };
    if (activeTrip.status === "picked_up") return { action: "verify_dropoff", label: "Hand over at destination", needsOtp: true };
    return null;
  }, [activeTrip]);

  const handleOffer = async (action: "accept" | "decline") => {
    if (!offer) return;
    setBusy(true);
    try {
      await respondToOffer(offer.id, action);
      toast({ title: action === "accept" ? "Trip accepted" : "Trip declined" });
    } catch (e) {
      toast({ title: "Could not respond", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleTripAction = async () => {
    if (!activeTrip || !nextAction) return;
    setBusy(true);
    try {
      await updateTrip(activeTrip.id, nextAction.action, nextAction.needsOtp ? { otp } : {});
      setOtp("");
      toast({ title: "Trip updated" });
    } catch (e) {
      toast({ title: "Could not update trip", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bike className="h-6 w-6" />
            </div>
            <CardTitle>Ride with Ovapass</CardTitle>
            <CardDescription>
              Earn on every device you pick up for a FixBudi repair center. Bring your own bike or ride one of ours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/rider/signup")}>
              Apply as a rider
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (rider.kyc_status !== "approved") {
    const rejected = rider.kyc_status === "rejected";
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Badge variant={rejected ? "destructive" : "secondary"} className="mx-auto">
              {rejected ? "Not approved" : "Under review"}
            </Badge>
            <CardTitle className="mt-2">Hello {rider.full_name.split(" ")[0]}</CardTitle>
            <CardDescription>
              {rejected
                ? rider.kyc_notes || "Your application was not approved. Contact support for details."
                : "We're verifying your documents. You'll be able to go online as soon as you're approved."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/contact-support">Contact support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Ovapass rider</p>
            <h1 className="text-xl font-bold">{rider.full_name}</h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/rider/earnings">
              <Wallet className="mr-2 h-4 w-4" /> Earnings
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{rider.is_online ? "You're online" : "You're offline"}</p>
              <p className="text-sm text-muted-foreground">
                {rider.is_online ? "Trips near you will pop up here" : "Go online to receive pickups"}
              </p>
            </div>
            <Switch checked={rider.is_online} onCheckedChange={setOnline} />
          </CardContent>
        </Card>

        {offer && offerTrip && !activeTrip && (
          <Card className="border-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">New {offerTrip.trip_type} request</CardTitle>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" /> {secondsLeft}s
                </Badge>
              </div>
              <CardDescription>
                {offer.distance_to_pickup_km != null
                  ? `${Number(offer.distance_to_pickup_km).toFixed(1)} km from you`
                  : "Nearby pickup"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <p className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="text-muted-foreground">Pick up: </span>
                    {offerTrip.pickup_address}
                  </span>
                </p>
                <p className="flex gap-2">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="text-muted-foreground">Deliver to: </span>
                    {offerTrip.dropoff_address}
                  </span>
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">You earn</span>
                <span className="text-lg font-semibold">{formatMoney(offerTrip.rider_earning, offerTrip.currency)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => handleOffer("decline")}>
                  Decline
                </Button>
                <Button className="flex-1" disabled={busy || secondsLeft === 0} onClick={() => handleOffer("accept")}>
                  Accept
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTrip && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Active {activeTrip.trip_type}</CardTitle>
                <Badge>{activeTrip.status.replace(/_/g, " ")}</Badge>
              </div>
              <CardDescription>
                {activeTrip.distance_km ? `${Number(activeTrip.distance_km).toFixed(1)} km trip` : "Trip in progress"} ·{" "}
                {formatMoney(activeTrip.rider_earning, activeTrip.currency)} to you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <p className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{activeTrip.pickup_address}</span>
                </p>
                <p className="flex gap-2">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{activeTrip.dropoff_address}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      activeTrip.status === "picked_up" ? activeTrip.dropoff_address : activeTrip.pickup_address,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation className="mr-2 h-4 w-4" /> Navigate
                  </a>
                </Button>
                {activeTrip.customer_phone && (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`tel:${activeTrip.customer_phone}`}>
                      <Phone className="mr-2 h-4 w-4" /> Call customer
                    </a>
                  </Button>
                )}
              </div>

              {nextAction?.needsOtp && (
                <div className="space-y-2">
                  <Label htmlFor="otp">
                    {activeTrip.status === "picked_up" ? "Drop-off code" : "Pickup code"} from{" "}
                    {activeTrip.status === "picked_up" ? "the receiver" : "the customer"}
                  </Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="4-digit code"
                  />
                </div>
              )}

              {nextAction && (
                <Button className="w-full" disabled={busy || (nextAction.needsOtp && otp.length !== 4)} onClick={handleTripAction}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {nextAction.label}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await updateTrip(activeTrip.id, "cancel", { reason: "Rider cancelled" });
                    toast({ title: "Trip released", description: "It will be offered to another rider." });
                  } catch (e) {
                    toast({ title: "Could not cancel", description: (e as Error).message, variant: "destructive" });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Cancel this trip
              </Button>
            </CardContent>
          </Card>
        )}

        {!offer && !activeTrip && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {rider.is_online ? "Waiting for the next pickup near you…" : "You're offline. Flip the switch to start earning."}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">{rider.total_trips}</p>
              <p className="text-xs text-muted-foreground">Trips completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">{Number(rider.average_rating ?? 0).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Average rating</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OvapassRiderHome;
