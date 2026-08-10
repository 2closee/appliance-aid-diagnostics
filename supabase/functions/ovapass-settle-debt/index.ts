// Clears the commission a third-party (partner) rider owes FixBudi.
// Admins confirm a received payment; the oldest open commission entries are
// cleared first and the rider is unblocked once the debt is under the cap.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, round2 } from "../_shared/overpass/geo.ts";

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

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return jsonResponse({ error: "Only admins can confirm settlements" }, 403);

    const { rider_id, amount, note } = await req.json() as {
      rider_id?: string;
      amount?: number;
      note?: string;
    };

    if (!rider_id || !amount || Number(amount) <= 0) {
      return jsonResponse({ error: "rider_id and a positive amount are required" }, 400);
    }

    const { data: open } = await supabase
      .from("rider_ledger")
      .select("id, amount")
      .eq("rider_id", rider_id)
      .eq("entry_type", "commission")
      .eq("settled", false)
      .order("created_at", { ascending: true });

    let remaining = round2(Number(amount));
    const cleared: string[] = [];
    const now = new Date().toISOString();

    for (const entry of open ?? []) {
      const owed = Math.abs(Number(entry.amount));
      if (remaining + 0.01 < owed) break;
      remaining = round2(remaining - owed);
      cleared.push(entry.id);
    }

    if (cleared.length) {
      await supabase
        .from("rider_ledger")
        .update({ settled: true, settled_at: now, settled_by: user.id })
        .in("id", cleared);
    }

    await supabase.from("rider_ledger").insert({
      rider_id,
      entry_type: "settlement",
      amount: round2(Number(amount)),
      settled: true,
      settled_at: now,
      settled_by: user.id,
      description: note ?? "Commission payment received by FixBudi",
    });

    const { data: stillOpen } = await supabase
      .from("rider_ledger")
      .select("amount")
      .eq("rider_id", rider_id)
      .eq("entry_type", "commission")
      .eq("settled", false);

    const { data: pricing } = await supabase
      .from("overpass_pricing")
      .select("max_unsettled_trips, max_unsettled_amount")
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    const owedTrips = stillOpen?.length ?? 0;
    const owedAmount = round2(
      (stillOpen ?? []).reduce((s: number, e: { amount: number }) => s + Math.abs(Number(e.amount)), 0),
    );
    const blocked =
      owedTrips >= Number(pricing?.max_unsettled_trips ?? 5) ||
      owedAmount >= Number(pricing?.max_unsettled_amount ?? 20000);

    await supabase.from("riders").update({ settlement_blocked: blocked }).eq("id", rider_id);

    return jsonResponse({
      success: true,
      entries_cleared: cleared.length,
      outstanding_amount: owedAmount,
      outstanding_trips: owedTrips,
      settlement_blocked: blocked,
    });
  } catch (error) {
    console.error("[ovapass-settle-debt]", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
