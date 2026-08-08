// Shared geo + pricing helpers for Ovapass (FixBudi's own rider fleet).

export interface PricingConfig {
  id: string;
  city: string;
  currency: string;
  base_fare: number;
  per_km: number;
  min_fare: number;
  bulky_surcharge: number;
  after_hours_surcharge: number;
  after_hours_start: number;
  after_hours_end: number;
  commission_rate_partner: number;
  commission_rate_company: number;
  max_radius_km: number;
  offer_timeout_seconds: number;
  max_assignment_attempts: number;
  active: boolean;
}

// Resolves a free-text Nigerian address to coordinates using Mapbox geocoding.
export async function geocodeAddress(
  address: string | null | undefined,
): Promise<{ lat: number; lng: number } | null> {
  const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
  if (!token || !address) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json` +
      `?access_token=${token}&country=NG&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[overpass] geocode ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const c = data?.features?.[0]?.center;
    if (!Array.isArray(c) || c.length < 2) return null;
    return { lat: Number(c[1]), lng: Number(c[0]) };
  } catch (e) {
    console.warn(`[overpass] geocode failed: ${(e as Error).message}`);
    return null;
  }
}


export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Road distance via Mapbox Directions (cycling profile suits e-bikes),
// with a haversine fallback so pricing never blocks on an external call.
export async function roadDistanceKm(
  pickupLat: number,
  pickupLng: number,
  dropLat: number,
  dropLng: number,
): Promise<{ distance_km: number; source: "mapbox" | "haversine" }> {
  const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
  const fallback = {
    distance_km: round2(haversineKm(pickupLat, pickupLng, dropLat, dropLng) * 1.3),
    source: "haversine" as const,
  };
  if (!token) return fallback;

  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/cycling/` +
      `${pickupLng},${pickupLat};${dropLng},${dropLat}` +
      `?access_token=${token}&overview=false`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[overpass] mapbox directions ${res.status}: ${await res.text()}`);
      return fallback;
    }
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters !== "number") return fallback;
    return { distance_km: round2(meters / 1000), source: "mapbox" };
  } catch (e) {
    console.warn(`[overpass] mapbox directions failed: ${(e as Error).message}`);
    return fallback;
  }
}

export interface FeeBreakdown {
  distance_km: number;
  base_fare: number;
  distance_charge: number;
  bulky_surcharge: number;
  after_hours_surcharge: number;
  fee: number;
  currency: string;
  commission_rate: number;
  commission_amount: number;
  rider_earning: number;
}

export function calculateFee(
  pricing: PricingConfig,
  distanceKm: number,
  opts: { isBulky?: boolean; fleetType?: string; at?: Date } = {},
): FeeBreakdown {
  const at = opts.at ?? new Date();
  const hour = at.getUTCHours() + 1; // Lagos time (UTC+1), no DST
  const localHour = ((hour % 24) + 24) % 24;

  const isAfterHours =
    pricing.after_hours_start <= pricing.after_hours_end
      ? localHour >= pricing.after_hours_start && localHour < pricing.after_hours_end
      : localHour >= pricing.after_hours_start || localHour < pricing.after_hours_end;

  const distanceCharge = round2(pricing.per_km * distanceKm);
  const bulky = opts.isBulky ? Number(pricing.bulky_surcharge) : 0;
  const afterHours = isAfterHours ? Number(pricing.after_hours_surcharge) : 0;

  const raw = Number(pricing.base_fare) + distanceCharge + bulky + afterHours;
  const fee = round2(Math.max(raw, Number(pricing.min_fare)));

  const commissionRate =
    opts.fleetType === "company"
      ? Number(pricing.commission_rate_company)
      : Number(pricing.commission_rate_partner);

  const commissionAmount = round2(fee * commissionRate);
  const riderEarning = round2(fee - commissionAmount);

  return {
    distance_km: distanceKm,
    base_fare: Number(pricing.base_fare),
    distance_charge: distanceCharge,
    bulky_surcharge: bulky,
    after_hours_surcharge: afterHours,
    fee,
    currency: pricing.currency,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    rider_earning: riderEarning,
  };
}

export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
