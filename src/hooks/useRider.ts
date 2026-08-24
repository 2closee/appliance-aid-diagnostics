import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playChime } from "@/lib/chime";

export interface RiderProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  fleet_type: string;
  kyc_status: string;
  kyc_notes: string | null;
  bike_make: string | null;
  plate_number: string | null;
  is_online: boolean;
  is_available: boolean;
  settlement_blocked: boolean;
  last_lat: number | null;
  last_lng: number | null;
  average_rating: number | null;
  total_trips: number;
}

export interface TripOffer {
  id: string;
  trip_id: string;
  status: string;
  expires_at: string;
  distance_to_pickup_km: number | null;
}

export interface OvapassTrip {
  id: string;
  repair_job_id: string;
  trip_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  distance_km: number | null;
  fee: number | null;
  currency: string;
  rider_earning: number | null;
  commission_amount: number | null;
  pickup_otp: string | null;
  dropoff_otp: string | null;
}

const PING_INTERVAL_MS = 20000;
const ACTIVE_PING_INTERVAL_MS = 8000;

export function useRider() {
  const { user } = useAuth();
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [offer, setOffer] = useState<TripOffer | null>(null);
  const [offerTrip, setOfferTrip] = useState<OvapassTrip | null>(null);
  const [activeTrip, setActiveTrip] = useState<OvapassTrip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pingTimer = useRef<number | null>(null);
  const lastRetryAt = useRef(0);
  const lastOfferAlert = useRef<{ tripId: string; at: number } | null>(null);

  const alertForTrip = useCallback((tripId: string) => {
    const previous = lastOfferAlert.current;
    if (previous?.tripId === tripId && Date.now() - previous.at < 5_000) return;
    lastOfferAlert.current = { tripId, at: Date.now() };
    playChime();
  }, []);

  const loadRider = useCallback(async () => {
    if (!user) {
      setRider(null);
      setIsLoading(false);
      return null;
    }
    const { data } = await supabase
      .from("riders")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setRider((data as RiderProfile) ?? null);
    setIsLoading(false);
    return (data as RiderProfile) ?? null;
  }, [user]);

  const loadWork = useCallback(async (riderId: string) => {
    const { data: trips } = await supabase
      .from("overpass_trips")
      .select("*")
      .eq("rider_id", riderId)
      .in("status", ["accepted", "en_route_to_pickup", "picked_up"])
      .order("created_at", { ascending: false })
      .limit(1);

    setActiveTrip((trips?.[0] as OvapassTrip) ?? null);

    const { data: offers } = await supabase
      .from("trip_offers")
      .select("*")
      .eq("rider_id", riderId)
      .eq("status", "offered")
      .gt("expires_at", new Date().toISOString())
      .order("offered_at", { ascending: false })
      .limit(1);

    const current = (offers?.[0] as TripOffer) ?? null;
    setOffer(current);

    if (current) {
      const { data: trip } = await supabase
        .from("overpass_trips")
        .select("*")
        .eq("id", current.trip_id)
        .maybeSingle();
      setOfferTrip((trip as OvapassTrip) ?? null);
    } else {
      setOfferTrip(null);
    }
  }, []);

  useEffect(() => {
    loadRider().then((r) => {
      if (!r) return;
      loadWork(r.id);
      // An already-online rider opening the app should pick up trips that
      // stalled while no suitable vehicle was reachable.
      if (r.is_online && r.kyc_status === "approved") {
        void supabase.functions.invoke("overpass-assign", { body: { retry_searching: true } });
      }
    });
  }, [loadRider, loadWork]);


  // Live offers and trip changes
  useEffect(() => {
    if (!rider) return;
    const channel = supabase
      .channel(`ovapass-rider-${rider.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_offers", filter: `rider_id=eq.${rider.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") alertForTrip(String(payload.new.trip_id));
          loadWork(rider.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${rider.user_id}` },
        (payload) => {
          if (payload.new.related_entity_type !== "ovapass_trip") return;
          alertForTrip(String(payload.new.related_entity_id));
          loadWork(rider.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "overpass_trips" },
        () => loadWork(rider.id),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rider, loadWork, alertForTrip]);

  const pingLocation = useCallback(async (riderId: string) => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        await supabase
          .from("riders")
          .update({ last_lat: latitude, last_lng: longitude, last_ping_at: new Date().toISOString() })
          .eq("id", riderId);
        await supabase
          .from("rider_locations")
          .insert({ rider_id: riderId, lat: latitude, lng: longitude, accuracy_m: accuracy });
        // Periodically rescue searching trips while an eligible rider is online.
        // The edge function enforces live-offer uniqueness and re-offer cooldowns.
        if (Date.now() - lastRetryAt.current >= 90_000) {
          lastRetryAt.current = Date.now();
          void supabase.functions.invoke("overpass-assign", { body: { retry_searching: true } });
        }
      },
      (err) => console.warn("Location unavailable:", err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, []);

  // Heartbeat while online
  useEffect(() => {
    if (!rider?.is_online) {
      if (pingTimer.current) window.clearInterval(pingTimer.current);
      pingTimer.current = null;
      return;
    }
    pingLocation(rider.id);
    const interval = activeTrip ? ACTIVE_PING_INTERVAL_MS : PING_INTERVAL_MS;
    pingTimer.current = window.setInterval(() => pingLocation(rider.id), interval);
    return () => {
      if (pingTimer.current) window.clearInterval(pingTimer.current);
      pingTimer.current = null;
    };
  }, [rider?.is_online, rider?.id, activeTrip?.id, pingLocation, rider]);

  const setOnline = useCallback(
    async (online: boolean) => {
      if (!rider) return;
      await supabase
        .from("riders")
        .update({ is_online: online, last_ping_at: new Date().toISOString() })
        .eq("id", rider.id);
      setRider({ ...rider, is_online: online });
      if (online) {
        lastRetryAt.current = Date.now();
        pingLocation(rider.id);
        // Pick up trips that stalled while no rider had a fresh location.
        void supabase.functions.invoke("overpass-assign", { body: { retry_searching: true } });
      }
    },
    [rider, pingLocation],
  );

  const respondToOffer = useCallback(
    async (offerId: string, action: "accept" | "decline") => {
      const { data, error } = await supabase.functions.invoke("overpass-respond-offer", {
        body: { offer_id: offerId, action },
      });
      if (rider) await loadWork(rider.id);
      if (error) throw error;
      return data;
    },
    [rider, loadWork],
  );

  const updateTrip = useCallback(
    async (tripId: string, action: string, extra: Record<string, unknown> = {}) => {
      const { data, error } = await supabase.functions.invoke("overpass-trip-status", {
        body: { trip_id: tripId, action, ...extra },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      if (rider) await loadWork(rider.id);
      return data;
    },
    [rider, loadWork],
  );

  return {
    rider,
    offer,
    offerTrip,
    activeTrip,
    isLoading,
    reload: loadRider,
    setOnline,
    respondToOffer,
    updateTrip,
  };
}
