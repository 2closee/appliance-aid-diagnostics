// Creates an Ovapass trip when a repair center approves a pickup (or a return),
// prices it from the distance covered, and immediately offers it to the nearest rider.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  roadDistanceKm,
  calculateFee,
  generateOtp,
  haversineKm,
  geocodeAddress,
} from "../_shared/overpass/geo.ts";
import { assignNextRider, getPricing } from "../_shared/overpass/assign.ts";

interface Body {
  repair_job_id: string;
  trip_type?: "pickup" | "return";
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body: Body = await req.json();
    if (!body?.repair_job_id) return jsonResponse({ error: "repair_job_id is required" }, 400);

    const tripType = body.trip_type === "return" ? "return" : "pickup";

    const { data: job, error: jobError } = await supabase
      .from("repair_jobs")
      .select(`*, center:repair_center_id ( id, name, address, phone )`)
      .eq("id", body.repair_job_id)
      .single();

    if (jobError || !job) return jsonResponse({ error: "Repair job not found" }, 404);

    // Only center staff or an admin may dispatch a rider.
    const { data: isStaff } = await supabase.rpc("is_staff_at_center", {
      _user_id: user.id,
      _center_id: job.repair_center_id,
    });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isStaff && !isAdmin) {
      return jsonResponse({ error: "Only the repair center or an admin can dispatch a rider" }, 403);
    }

    // Do not create a second live trip of the same type for one job.
    const { data: existing } = await supabase
      .from("overpass_trips")
      .select("id, status")
      .eq("repair_job_id", body.repair_job_id)
      .eq("trip_type", tripType)
      .not("status", "in", '("completed","cancelled")')
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: "A live Ovapass trip already exists for this job", trip_id: existing.id }, 409);
    }

    const center = job.center;
    const pickupAddress = tripType === "pickup" ? job.pickup_address : center?.address;
    const dropoffAddress = tripType === "pickup" ? center?.address : job.pickup_address;

    if (!pickupAddress || !dropoffAddress) {
      return jsonResponse({ error: "Both the customer address and the repair center address are required" }, 400);
    }

    // Coordinates: use what the caller sent, otherwise geocode the addresses.
    let pickupLat = body.pickup_lat;
    let pickupLng = body.pickup_lng;
    let dropLat = body.dropoff_lat;
    let dropLng = body.dropoff_lng;

    if (pickupLat == null || pickupLng == null) {
      const geo = await geocodeAddress(pickupAddress);
      if (geo) {
        pickupLat = geo.lat;
        pickupLng = geo.lng;
      }
    }
    if (dropLat == null || dropLng == null) {
      const geo = await geocodeAddress(dropoffAddress);
      if (geo) {
        dropLat = geo.lat;
        dropLng = geo.lng;
      }
    }

    const pricing = await getPricing(supabase);

    let distanceKm = 0;
    if (pickupLat != null && pickupLng != null && dropLat != null && dropLng != null) {
      const d = await roadDistanceKm(Number(pickupLat), Number(pickupLng), Number(dropLat), Number(dropLng));
      distanceKm = d.distance_km;
    }
    // With no usable coordinates the distance stays 0 and the minimum fare
    // applies; an admin can adjust the fee afterwards.


    const isBulky = job.logistics_category === "bulky";
    const breakdown = calculateFee(pricing, distanceKm, { isBulky });

    // Match the pickup point to a service zone.
    let zoneId: string | null = null;
    if (pickupLat != null && pickupLng != null) {
      const { data: zones } = await supabase
        .from("logistics_service_zones")
        .select("id, center_lat, center_lng, radius_km, active")
        .eq("active", true);
      for (const z of zones ?? []) {
        if (z.center_lat == null || z.center_lng == null) continue;
        const d = haversineKm(Number(pickupLat), Number(pickupLng), Number(z.center_lat), Number(z.center_lng));
        if (d <= Number(z.radius_km ?? 5)) {
          zoneId = z.id;
          break;
        }
      }
    }

    const { data: trip, error: tripError } = await supabase
      .from("overpass_trips")
      .insert({
        repair_job_id: body.repair_job_id,
        trip_type: tripType,
        status: "pending",
        zone_id: zoneId,
        pickup_address: pickupAddress,
        pickup_lat: pickupLat ?? null,
        pickup_lng: pickupLng ?? null,
        dropoff_address: dropoffAddress,
        dropoff_lat: dropLat ?? null,
        dropoff_lng: dropLng ?? null,
        customer_name: job.customer_name,
        customer_phone: job.customer_phone,
        distance_km: distanceKm,
        fee: breakdown.fee,
        currency: breakdown.currency,
        commission_rate: breakdown.commission_rate,
        commission_amount: breakdown.commission_amount,
        rider_earning: breakdown.rider_earning,
        pickup_otp: generateOtp(),
        dropoff_otp: generateOtp(),
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (tripError) throw new Error(`Could not create trip: ${tripError.message}`);

    // Mirror into delivery_requests so existing customer tracking keeps working.
    const { data: delivery } = await supabase
      .from("delivery_requests")
      .insert({
        repair_job_id: body.repair_job_id,
        delivery_type: tripType,
        provider: "overpass",
        provider_name: "overpass",
        provider_order_id: trip.id,
        pickup_address: pickupAddress,
        delivery_address: dropoffAddress,
        customer_name: job.customer_name,
        customer_phone: job.customer_phone,
        estimated_cost: breakdown.fee,
        app_delivery_commission: breakdown.commission_amount,
        currency: breakdown.currency,
        delivery_status: "pending",
        cash_payment_status: "pending",
        pickup_otp: tripType === "pickup" ? trip.pickup_otp : null,
        return_otp: tripType === "return" ? trip.dropoff_otp : null,
        notes: `Ovapass ${tripType} for ${job.appliance_type ?? "device"}`,
      })
      .select()
      .single();

    if (delivery) {
      await supabase.from("overpass_trips").update({ delivery_request_id: delivery.id }).eq("id", trip.id);
    }

    const assignment = await assignNextRider(supabase, trip.id, pricing);

    return jsonResponse({
      success: true,
      trip: { ...trip, delivery_request_id: delivery?.id ?? null },
      fee_breakdown: breakdown,
      assignment,
    });
  } catch (error) {
    console.error("[overpass-create-trip]", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
