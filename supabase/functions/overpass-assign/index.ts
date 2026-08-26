// Re-runs nearest-rider assignment for a trip. Called by the rider app when an
// offer times out, and by the admin dispatch board to retry a stuck trip.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/overpass/geo.ts";
import { assignNextRider, expireStaleOffers, retrySearchingTrips } from "../_shared/overpass/assign.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { trip_id, reset_attempts, retry_searching, source } = await req.json();

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isScheduledRetry = token === Deno.env.get("SUPABASE_ANON_KEY") &&
      source === "cron" && retry_searching === true && !trip_id;
    const { data: { user }, error: authError } = isServiceRole
      ? { data: { user: null }, error: null }
      : await supabase.auth.getUser(token);
    if (!isServiceRole && !isScheduledRetry && (authError || !user)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = user?.id ?? null;

    // A rider coming online (or refreshing location) retries trips that stalled
    // because no rider had a fresh position at the time.
    if (retry_searching && !trip_id) {
      if (isServiceRole || isScheduledRetry) {
        await expireStaleOffers(supabase);
        const results = await retrySearchingTrips(supabase);
        return jsonResponse({ success: true, retried: results.length });
      }
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);
      const { data: riderId } = await supabase.rpc("get_rider_id", { _user_id: userId });
      if (!riderId) return jsonResponse({ error: "Not a rider" }, 403);
      await expireStaleOffers(supabase);
      const results = await retrySearchingTrips(supabase);
      return jsonResponse({ success: true, retried: results.length, assignments: results });
    }

    if (!trip_id) return jsonResponse({ error: "trip_id is required" }, 400);

    const { data: isAdmin } = isServiceRole
      ? { data: true }
      : await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

    const { data: trip } = await supabase
      .from("overpass_trips")
      .select("id, status, repair_job_id, rider_id")
      .eq("id", trip_id)
      .maybeSingle();

    if (!trip) return jsonResponse({ error: "Trip not found" }, 404);

    if (!isAdmin) {
      // Center staff for this job may retry. The job's customer may also retry
      // immediately after quote acceptance, which is how automatic dispatch runs.
      const { data: job } = await supabase
        .from("repair_jobs")
        .select("repair_center_id, user_id, job_status")
        .eq("id", trip.repair_job_id)
        .maybeSingle();
      const { data: isStaff } = await supabase.rpc("is_staff_at_center", {
        _user_id: userId,
        _center_id: job?.repair_center_id,
      });
      const isJobCustomerAfterAcceptance = job?.user_id === userId &&
        ["quote_accepted", "pickup_scheduled"].includes(job?.job_status ?? "");
      if (!isStaff && !isJobCustomerAfterAcceptance) {
        return jsonResponse({ error: "Not allowed to reassign this trip" }, 403);
      }
    }

    await expireStaleOffers(supabase);

    if (reset_attempts && isAdmin) {
      await supabase
        .from("overpass_trips")
        .update({ assignment_attempts: 0, status: "pending" })
        .eq("id", trip_id);
    }

    const result = await assignNextRider(supabase, trip_id);
    return jsonResponse({ success: true, assignment: result });
  } catch (error) {
    console.error("[ovapass-assign]", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
