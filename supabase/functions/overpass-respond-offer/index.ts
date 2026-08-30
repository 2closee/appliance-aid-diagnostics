// Rider accepts or declines a trip offer. Accepting locks the trip to the rider;
// declining or letting it expire rotates the offer to the next nearest rider.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateFee, corsHeaders, jsonResponse } from "../_shared/overpass/geo.ts";
import { assignNextRider, getPricing, getVehicleRate } from "../_shared/overpass/assign.ts";

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

    const { offer_id, action } = await req.json();
    if (!offer_id || !["accept", "decline"].includes(action)) {
      return jsonResponse({ error: "offer_id and action (accept|decline) are required" }, 400);
    }

    const { data: rider } = await supabase
      .from("riders")
      .select("id, kyc_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!rider) return jsonResponse({ error: "You are not registered as a rider" }, 403);
    if (rider.kyc_status !== "approved") {
      return jsonResponse({ error: "Your rider account is not approved yet" }, 403);
    }

    const { data: offer } = await supabase
      .from("trip_offers")
      .select("*")
      .eq("id", offer_id)
      .maybeSingle();

    if (!offer) return jsonResponse({ error: "Offer not found" }, 404);
    if (offer.rider_id !== rider.id) return jsonResponse({ error: "This offer is not yours" }, 403);
    if (offer.status !== "offered") return jsonResponse({ error: `Offer already ${offer.status}` }, 409);

    const expired = new Date(offer.expires_at).getTime() < Date.now();
    const now = new Date().toISOString();

    if (action === "decline" || expired) {
      await supabase
        .from("trip_offers")
        .update({ status: expired ? "expired" : "declined", responded_at: now })
        .eq("id", offer_id);

      const next = await assignNextRider(supabase, offer.trip_id);
      return jsonResponse({
        success: true,
        outcome: expired ? "expired" : "declined",
        reassignment: next,
      });
    }

    // Accept: only if nobody else took the trip first.
    const { data: claimed, error: claimError } = await supabase
      .from("overpass_trips")
      .update({ rider_id: rider.id, status: "accepted", accepted_at: now })
      .eq("id", offer.trip_id)
      .is("rider_id", null)
      .select()
      .maybeSingle();

    if (claimError) throw new Error(claimError.message);
    if (!claimed) {
      await supabase.from("trip_offers").update({ status: "expired", responded_at: now }).eq("id", offer_id);
      return jsonResponse({ error: "This trip was already taken" }, 409);
    }

    await supabase
      .from("trip_offers")
      .update({ status: "accepted", responded_at: now })
      .eq("id", offer_id);

    await supabase.from("riders").update({ is_available: false }).eq("id", rider.id);

    const { data: riderProfile } = await supabase
      .from("riders")
      .select("full_name, phone, bike_make, plate_number, vehicle_class, fleet_type")
      .eq("id", rider.id)
      .maybeSingle();

    // The trip was quoted with the category's default vehicle. Now that we know
    // the accepting rider's vehicle, reprice with that class's per-km rate.
    let priced = claimed;
    try {
      const pricing = await getPricing(supabase);
      const rate = await getVehicleRate(supabase, riderProfile?.vehicle_class, pricing.city);
      if (rate) {
        const breakdown = calculateFee(pricing, Number(claimed.distance_km ?? 0), {
          isBulky: claimed.required_capability === "bulky",
          fleetType: riderProfile?.fleet_type,
          rate,
        });
        const { data: repriced } = await supabase
          .from("overpass_trips")
          .update({
            quoted_fee: claimed.quoted_fee ?? claimed.fee,
            fee: breakdown.fee,
            commission_rate: breakdown.commission_rate,
            commission_amount: breakdown.commission_amount,
            rider_earning: breakdown.rider_earning,
            rate_vehicle_class: rate.vehicle_class,
          })
          .eq("id", claimed.id)
          .select()
          .maybeSingle();
        if (repriced) priced = repriced;
      }
    } catch (e) {
      console.error(`[ovapass-respond-offer] repricing skipped: ${(e as Error).message}`);
    }

    if (claimed.delivery_request_id) {
      await supabase
        .from("delivery_requests")
        .update({
          delivery_status: "assigned",
          rider_name: riderProfile?.full_name ?? null,
          rider_phone: riderProfile?.phone ?? null,
          rider_vehicle: [riderProfile?.bike_make, riderProfile?.plate_number].filter(Boolean).join(" • ") || "Electric bike",
          driver_name: riderProfile?.full_name ?? null,
          driver_phone: riderProfile?.phone ?? null,
          estimated_cost: priced.fee,
          app_delivery_commission: priced.commission_amount,
        })
        .eq("id", claimed.delivery_request_id);
    }

    return jsonResponse({ success: true, outcome: "accepted", trip: priced });
  } catch (error) {
    console.error("[ovapass-respond-offer]", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
