// Nearest-rider auto-assignment for Ovapass trips.
// Ranks online, approved, available riders by distance from the pickup point
// and offers the trip to the closest one who has not declined it.

import { haversineKm, PricingConfig, VehicleClass, VehicleRate } from "./geo.ts";
import { sendSms } from "../sms/dispatcher.ts";
import { normalizeNigerianPhone } from "../sms/types.ts";

// deno-lint-ignore no-explicit-any
type Client = any;

export interface AssignResult {
  assigned: boolean;
  rider_id?: string;
  offer_id?: string;
  attempt?: number;
  reason?: string;
  candidates_considered?: number;
  required_capability?: "gadget" | "bulky";
}


const STALE_PING_MINUTES = 10;
const REOFFER_COOLDOWN_SECONDS = 90;

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

// How far a rider may be from the pickup before they stop being eligible.
// Nothing beyond this is offered the trip; the trip simply keeps searching.
export function searchRadiusKm(pricing: PricingConfig): number {
  const configured = Number(pricing.max_search_radius_km ?? 0);
  return configured > 0 ? configured : 58;
}

// The vehicle class we price a trip with before a rider is known: gadgets are
// quoted at the bike rate, bulky appliances at the van rate.
export function quoteVehicleClass(requiredCapability: "gadget" | "bulky"): VehicleClass {
  return requiredCapability === "bulky" ? "van" : "bike";
}

export async function getVehicleRate(
  supabase: Client,
  vehicleClass: string | null | undefined,
  city = "Port Harcourt",
): Promise<VehicleRate | null> {
  if (!vehicleClass) return null;
  const { data } = await supabase
    .from("overpass_vehicle_rates")
    .select("vehicle_class, per_km, base_fare, min_fare")
    .eq("city", city)
    .eq("vehicle_class", vehicleClass)
    .eq("active", true)
    .maybeSingle();
  return (data as VehicleRate | null) ?? null;
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

  // A live offer must finish before another rider can be offered the trip.
  const { data: priorOffers } = await supabase
    .from("trip_offers")
    .select("id, rider_id, status, responded_at, expires_at")
    .eq("trip_id", tripId);

  const liveOffer = (priorOffers ?? []).find(
    (o: { status: string; expires_at: string }) =>
      o.status === "offered" && new Date(o.expires_at).getTime() > Date.now(),
  );
  if (liveOffer) {
    return { assigned: true, rider_id: liveOffer.rider_id, offer_id: liveOffer.id, reason: "Offer sent—waiting for rider" };
  }

  // A decline excludes the rider for this trip. An expired offer only applies a
  // short cooldown, allowing the sole nearby qualified rider to be alerted again.
  const cooldownSince = Date.now() - REOFFER_COOLDOWN_SECONDS * 1000;
  const excluded = new Set<string>(
    (priorOffers ?? [])
      .filter((o: { status: string; responded_at: string | null; expires_at: string }) => {
        if (o.status === "declined") return true;
        if (o.status !== "expired") return false;
        const finishedAt = o.responded_at ?? o.expires_at;
        return new Date(finishedAt).getTime() > cooldownSince;
      })
      .map((o: { rider_id: string }) => o.rider_id),
  );

  

  // What this package needs: bulky appliances (TV, AC, washing machine, fridge)
  // require a bulky-capable vehicle; gadgets can go on a bike or any vehicle.
  const requiredCapability: "gadget" | "bulky" = trip.required_capability === "bulky" ? "bulky" : "gadget";
  const allowedCapabilities = requiredCapability === "bulky" ? ["bulky", "both"] : ["gadget", "both"];

  const { data: riders, error: ridersError } = await supabase
    .from("riders")
    .select(
      "id, full_name, fleet_type, vehicle_class, carry_capability, last_lat, last_lng, last_ping_at, home_zone_id, average_rating",
    )
    .eq("settlement_blocked", false)
    .eq("is_online", true)
    .eq("is_available", true)
    .eq("kyc_status", "approved")
    .in("carry_capability", allowedCapabilities);

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
      // The search widens all the way to the maximum radius (58 km by default)
      // rather than failing when nobody is close; ranking still favours the
      // nearest rider. Riders without a known position qualify via their zone.
      if (r.distance_to_pickup_km != null) {
        return r.distance_to_pickup_km <= searchRadiusKm(config);
      }
      return trip.zone_id != null && r.home_zone_id === trip.zone_id;
    })
    .sort(
      (
        a: { distance_to_pickup_km: number | null; fleet_type: string },
        b: { distance_to_pickup_km: number | null; fleet_type: string },
      ) => {
        // Ovapass fleet riders get gadget work first; bulky is ranked purely by
        // distance since only third-party vehicles usually qualify.
        if (requiredCapability === "gadget" && a.fleet_type !== b.fleet_type) {
          if (a.fleet_type === "company") return -1;
          if (b.fleet_type === "company") return 1;
        }
        return (a.distance_to_pickup_km ?? 9999) - (b.distance_to_pickup_km ?? 9999);
      },
    );

  if (!candidates.length) {
    await supabase
      .from("overpass_trips")
      .update({ status: "searching" })
      .eq("id", tripId);
    return {
      assigned: false,
      reason: requiredCapability === "bulky"
        ? "No bulky-capable vehicle online nearby"
        : "No rider online nearby",
      required_capability: requiredCapability,
      candidates_considered: 0,
    };
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

  if (offerError?.code === "23505") {
    const { data: existingOffer } = await supabase
      .from("trip_offers")
      .select("id, rider_id")
      .eq("trip_id", tripId)
      .eq("status", "offered")
      .maybeSingle();
    return {
      assigned: Boolean(existingOffer),
      rider_id: existingOffer?.rider_id,
      offer_id: existingOffer?.id,
      reason: existingOffer ? "Offer sent—waiting for rider" : "Another assignment is already in progress",
      required_capability: requiredCapability,
    };
  }
  if (offerError) throw new Error(`Could not create offer: ${offerError.message}`);

  await supabase
    .from("overpass_trips")
    .update({
      status: "searching",
      assignment_attempts: attempt,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  console.log(`[ovapass] trip ${tripId} offered to rider ${chosen.id} (attempt ${attempt})`);

  await notifyRiderOfOffer(supabase, chosen.id, trip);

  return {
    assigned: true,
    rider_id: chosen.id,
    offer_id: offer.id,
    attempt,
    required_capability: requiredCapability,
    candidates_considered: candidates.length,
  };

}

/**
 * Immediate rider alert for a fresh offer: an in-app notification (delivered live
 * through Realtime) plus an SMS fallback when a phone number is on file.
 * Alerting must never break dispatch, so failures are logged only.
 */
export async function notifyRiderOfOffer(
  supabase: Client,
  riderId: string,
  // deno-lint-ignore no-explicit-any
  trip: any,
): Promise<void> {
  try {
    const { data: rider } = await supabase
      .from("riders")
      .select("user_id, phone, full_name")
      .eq("id", riderId)
      .maybeSingle();

    if (!rider) return;

    const tripType = trip?.trip_type === "return" ? "return" : "pickup";
    const earning = Number(trip?.rider_earning ?? 0);
    const message = `New ${tripType} request${earning ? ` — you earn ₦${earning.toLocaleString()}` : ""}. Open Ovapass to accept.`;

    if (rider.user_id) {
      const { error } = await supabase.from("notifications").insert({
        user_id: rider.user_id,
        title: `New Ovapass ${tripType} request`,
        message,
        type: "alert",
        related_entity_type: "ovapass_trip",
        related_entity_id: trip?.id ?? null,
      });
      if (error) console.error(`[ovapass] rider notification failed: ${error.message}`);
    }

    if (rider.phone) {
      const phone = normalizeNigerianPhone(rider.phone);
      if (phone) {
        const sms = await sendSms({ to: phone, body: `FixBudi Ovapass: ${message}` });
        if (!sms.ok) console.error(`[ovapass] rider SMS failed: ${sms.error}`);
      }
    }
  } catch (e) {
    console.error(`[ovapass] rider alert error: ${(e as Error).message}`);
  }
}

/** Retries assignment for trips still searching, e.g. when a rider comes online. */
export async function retrySearchingTrips(supabase: Client, limit = 5): Promise<AssignResult[]> {
  const { data: trips } = await supabase
    .from("overpass_trips")
    .select("id")
    .in("status", ["pending", "searching"])
    .is("rider_id", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  const results: AssignResult[] = [];
  for (const t of trips ?? []) {
    try {
      results.push(await assignNextRider(supabase, t.id));
    } catch (e) {
      results.push({ assigned: false, reason: (e as Error).message });
    }
  }
  return results;
}
