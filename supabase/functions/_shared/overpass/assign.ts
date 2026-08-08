// Nearest-rider auto-assignment for Overpass trips.
// Ranks online, approved, available riders by distance from the pickup point
// and offers the trip to the closest one who has not already declined it.

import { haversineKm, PricingConfig } from "./geo.ts";

// deno-lint-ignore no-explicit-any
type Client = any;

export interface AssignResult {
  assigned: boolean;
  rider_id?: string;
  offer_id?: string;
  attempt?: number;
  reason?: string;
  candidates_considered?: number;
}

const STALE_PING_MINUTES = 10;

export async function expireStaleOffers(supabase: Client): Promise<void> {
  await supabase
    .from("trip_offers")
    .update({ status: "expired", responded_at: new Date().toISOString() })
    .eq("status", "offered")
    .lt("expires_at", new Date().toISOString());
}

export async function getPricing(supabase: Client, city = "Port Harcourt"): Promise<PricingConfig> {
  const { data, error } = await supabase
    .from("overpass_pricing")
    .select("*")
    .eq("city", city)
    .maybeSingle();
  if (error) throw new Error(`Pricing lookup failed: ${error.message}`);
  if (!data) throw new Error(`No pricing configured for ${city}`);
  return data as PricingConfig;
}

export async function assignNextRider(
  supabase: Client,
  tripId: string,
  pricing?: PricingConfig,
): Promise<AssignResult> {
  await expireStaleOffers(supabase);

  const { data: trip, error: tripError } = await supabase
    .from("overpass_trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) return { assigned: false, reason: "Trip not found" };
  if (trip.rider_id) return { assigned: false, reason: "Trip already has a rider" };
  if (!["pending", "searching"].includes(trip.status)) {
    return { assigned: false, reason: `Trip is ${trip.status}` };
  }

  const config = pricing ?? (await getPricing(supabase));

  if (trip.assignment_attempts >= config.max_assignment_attempts) {
    await supabase
      .from("overpass_trips")
      .update({ status: "unassigned" })
      .eq("id", tripId);
    return { assigned: false, reason: "No rider accepted after maximum attempts" };
  }

  // Riders that already saw this trip should not be offered it again.
  const { data: priorOffers } = await supabase
    .from("trip_offers")
    .select("rider_id, status")
    .eq("trip_id", tripId);

  const excluded = new Set<string>((priorOffers ?? []).map((o: { rider_id: string }) => o.rider_id));

  const staleBefore = new Date(Date.now() - STALE_PING_MINUTES * 60 * 1000).toISOString();

  const { data: riders, error: ridersError } = await supabase
    .from("riders")
    .select("id, full_name, fleet_type, last_lat, last_lng, last_ping_at, home_zone_id, average_rating")
    .eq("is_online", true)
    .eq("is_available", true)
    .eq("kyc_status", "approved")
    .gte("last_ping_at", staleBefore);

  if (ridersError) throw new Error(`Rider lookup failed: ${ridersError.message}`);

  const pickupLat = Number(trip.pickup_lat);
  const pickupLng = Number(trip.pickup_lng);
  const hasPickupCoords = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);

  const candidates = (riders ?? [])
    .filter((r: { id: string }) => !excluded.has(r.id))
    .map((r: { id: string; last_lat: number | null; last_lng: number | null; home_zone_id: string | null }) => {
      let distance: number | null = null;
      if (hasPickupCoords && r.last_lat != null && r.last_lng != null) {
        distance = haversineKm(Number(r.last_lat), Number(r.last_lng), pickupLat, pickupLng);
      }
      return { ...r, distance_to_pickup_km: distance };
    })
    .filter((r: { distance_to_pickup_km: number | null; home_zone_id: string | null }) => {
      // Outside the service radius riders are skipped; riders without a known
      // position still qualify when they belong to the trip's zone.
      if (r.distance_to_pickup_km != null) {
        return r.distance_to_pickup_km <= Number(config.max_radius_km);
      }
      return trip.zone_id != null && r.home_zone_id === trip.zone_id;
    })
    .sort(
      (
        a: { distance_to_pickup_km: number | null },
        b: { distance_to_pickup_km: number | null },
      ) => (a.distance_to_pickup_km ?? 9999) - (b.distance_to_pickup_km ?? 9999),
    );

  if (!candidates.length) {
    await supabase
      .from("overpass_trips")
      .update({ status: "searching" })
      .eq("id", tripId);
    return { assigned: false, reason: "No riders available nearby", candidates_considered: 0 };
  }

  const chosen = candidates[0];
  const attempt = (trip.assignment_attempts ?? 0) + 1;
  const expiresAt = new Date(Date.now() + config.offer_timeout_seconds * 1000).toISOString();

  const { data: offer, error: offerError } = await supabase
    .from("trip_offers")
    .insert({
      trip_id: tripId,
      rider_id: chosen.id,
      attempt_number: attempt,
      status: "offered",
      distance_to_pickup_km: chosen.distance_to_pickup_km,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (offerError) throw new Error(`Could not create offer: ${offerError.message}`);

  await supabase
    .from("overpass_trips")
    .update({
      status: "searching",
      assignment_attempts: attempt,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  console.log(`[overpass] trip ${tripId} offered to rider ${chosen.id} (attempt ${attempt})`);

  return {
    assigned: true,
    rider_id: chosen.id,
    offer_id: offer.id,
    attempt,
    candidates_considered: candidates.length,
  };
}
