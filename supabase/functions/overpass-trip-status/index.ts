// Rider-driven trip lifecycle: en route, OTP-verified pickup, OTP-verified drop
// off, completion (which writes the earning and commission ledger), and cancel.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/overpass/geo.ts";
import { assignNextRider } from "../_shared/overpass/assign.ts";

type Action = "en_route" | "verify_pickup" | "verify_dropoff" | "cancel";

const DELIVERY_STATUS: Record<string, string> = {
  en_route_to_pickup: "in_transit_to_pickup",
  picked_up: "picked_up",
  completed: "delivered",
  cancelled: "cancelled",
};

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

    const { trip_id, action, otp, reason } = await req.json() as {
      trip_id: string;
      action: Action;
      otp?: string;
      reason?: string;
    };

    if (!trip_id || !action) return jsonResponse({ error: "trip_id and action are required" }, 400);

    const { data: rider } = await supabase
      .from("riders")
      .select("id, fleet_type, total_trips")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });

    const { data: trip } = await supabase
      .from("overpass_trips")
      .select("*")
      .eq("id", trip_id)
      .maybeSingle();

    if (!trip) return jsonResponse({ error: "Trip not found" }, 404);

    const isAssignedRider = rider && trip.rider_id === rider.id;
    if (!isAssignedRider && !isAdmin) {
      return jsonResponse({ error: "Only the assigned rider can update this trip" }, 403);
    }

    const now = new Date().toISOString();
    let newStatus = trip.status;
    const patch: Record<string, unknown> = {};

    if (action === "en_route") {
      if (trip.status !== "accepted") return jsonResponse({ error: `Cannot start from ${trip.status}` }, 409);
      newStatus = "en_route_to_pickup";
    } else if (action === "verify_pickup") {
      if (!["accepted", "en_route_to_pickup"].includes(trip.status)) {
        return jsonResponse({ error: `Cannot collect from ${trip.status}` }, 409);
      }
      if (!otp || otp !== trip.pickup_otp) return jsonResponse({ error: "Incorrect pickup code" }, 400);
      newStatus = "picked_up";
      patch.pickup_otp_verified_at = now;
      patch.picked_up_at = now;
    } else if (action === "verify_dropoff") {
      if (trip.status !== "picked_up") return jsonResponse({ error: `Cannot drop off from ${trip.status}` }, 409);
      if (!otp || otp !== trip.dropoff_otp) return jsonResponse({ error: "Incorrect drop-off code" }, 400);
      newStatus = "completed";
      patch.dropoff_otp_verified_at = now;
      patch.completed_at = now;
    } else if (action === "cancel") {
      if (["completed", "cancelled"].includes(trip.status)) {
        return jsonResponse({ error: `Trip already ${trip.status}` }, 409);
      }
      newStatus = "cancelled";
      patch.cancelled_at = now;
      patch.cancel_reason = reason ?? "Cancelled by rider";
    } else {
      return jsonResponse({ error: "Unknown action" }, 400);
    }

    const { data: updated, error: updateError } = await supabase
      .from("overpass_trips")
      .update({ ...patch, status: newStatus })
      .eq("id", trip_id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    if (trip.delivery_request_id && DELIVERY_STATUS[newStatus]) {
      const deliveryPatch: Record<string, unknown> = { delivery_status: DELIVERY_STATUS[newStatus] };
      if (newStatus === "picked_up") deliveryPatch.actual_pickup_time = now;
      if (newStatus === "completed") {
        deliveryPatch.actual_delivery_time = now;
        deliveryPatch.actual_cost = trip.fee;
      }
      await supabase.from("delivery_requests").update(deliveryPatch).eq("id", trip.delivery_request_id);
    }

    if (newStatus === "completed" && trip.rider_id) {
      // Money trail: rider earns, and owes FixBudi its commission on the ride.
      const { data: alreadyLogged } = await supabase
        .from("rider_ledger")
        .select("id")
        .eq("trip_id", trip_id)
        .limit(1);

      const { data: period } = await supabase.rpc("get_settlement_period", { date_input: now });
      const isCompanyRider = rider?.fleet_type === "company";

      if (!alreadyLogged?.length) {
        await supabase.from("rider_ledger").insert([
          {
            rider_id: trip.rider_id,
            trip_id,
            entry_type: "earning",
            amount: trip.rider_earning ?? 0,
            currency: trip.currency,
            settlement_period: period ?? null,
            description: isCompanyRider
              ? `Wallet credit for ${trip.trip_type} trip`
              : `Cash collected on ${trip.trip_type} trip`,
          },
          {
            rider_id: trip.rider_id,
            trip_id,
            entry_type: "commission",
            amount: -(trip.commission_amount ?? 0),
            currency: trip.currency,
            settlement_period: period ?? null,
            settled: isCompanyRider,
            settled_at: isCompanyRider ? now : null,
            description: isCompanyRider
              ? `FixBudi share of ${trip.trip_type} trip (kept in app)`
              : `FixBudi commission owed on ${trip.trip_type} trip`,
          },
        ]);
      }

      const riderPatch: Record<string, unknown> = {
        is_available: true,
        total_trips: (rider?.total_trips ?? 0) + 1,
      };

      // Partner riders collect cash, so their commission becomes a debt. Once
      // that debt passes the admin-set cap they stop receiving new offers.
      if (!isCompanyRider) {
        const [{ data: pricing }, { data: openDebt }] = await Promise.all([
          supabase
            .from("overpass_pricing")
            .select("max_unsettled_trips, max_unsettled_amount")
            .eq("active", true)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("rider_ledger")
            .select("amount")
            .eq("rider_id", trip.rider_id)
            .eq("entry_type", "commission")
            .eq("settled", false),
        ]);

        const owedTrips = openDebt?.length ?? 0;
        const owedAmount = (openDebt ?? []).reduce(
          (sum: number, e: { amount: number }) => sum + Math.abs(Number(e.amount)),
          0,
        );
        const maxTrips = Number(pricing?.max_unsettled_trips ?? 5);
        const maxAmount = Number(pricing?.max_unsettled_amount ?? 20000);

        if (owedTrips >= maxTrips || owedAmount >= maxAmount) {
          riderPatch.settlement_blocked = true;
          riderPatch.is_online = false;
        }
      }

      await supabase.from("riders").update(riderPatch).eq("id", trip.rider_id);
    }

    if (newStatus === "cancelled") {
      if (trip.rider_id) {
        await supabase.from("riders").update({ is_available: true }).eq("id", trip.rider_id);
      }
      // Free the trip and look for another rider.
      await supabase
        .from("overpass_trips")
        .update({ rider_id: null, status: "pending" })
        .eq("id", trip_id);
      const reassignment = await assignNextRider(supabase, trip_id);
      return jsonResponse({ success: true, trip: updated, reassignment });
    }

    return jsonResponse({ success: true, trip: updated });
  } catch (error) {
    console.error("[overpass-trip-status]", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
