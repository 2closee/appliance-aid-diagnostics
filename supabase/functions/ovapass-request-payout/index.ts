// Weekly wallet withdrawal for FixBudi (company) riders. Earnings sit in the
// rider ledger; this creates a payout request an admin marks as paid.

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

    const body = await req.json().catch(() => ({}));
    const bankDetails = typeof body?.bank_details === "string" ? body.bank_details.slice(0, 300) : null;

    const { data: rider } = await supabase
      .from("riders")
      .select("id, fleet_type, kyc_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!rider) return jsonResponse({ error: "No rider profile found" }, 404);
    if (rider.kyc_status !== "approved") return jsonResponse({ error: "Your account is still under review" }, 403);
    if (rider.fleet_type !== "company") {
      return jsonResponse(
        { error: "Third-party riders collect their fee in cash, so there is nothing to withdraw." },
        400,
      );
    }

    const { data: pricing } = await supabase
      .from("overpass_pricing")
      .select("min_withdrawal, currency")
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    const { data: entries } = await supabase
      .from("rider_ledger")
      .select("id, entry_type, amount, settled")
      .eq("rider_id", rider.id);

    const balance = round2(
      (entries ?? [])
        .filter((e: { entry_type: string }) => ["earning", "payout", "adjustment"].includes(e.entry_type))
        .reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0),
    );

    const minWithdrawal = Number(pricing?.min_withdrawal ?? 2000);
    if (balance < minWithdrawal) {
      return jsonResponse(
        { error: `You need at least ₦${minWithdrawal.toLocaleString()} in your wallet to withdraw.` },
        400,
      );
    }

    const { data: period } = await supabase.rpc("get_settlement_period", {
      date_input: new Date().toISOString(),
    });

    const { data: existing } = await supabase
      .from("rider_payouts")
      .select("id, status")
      .eq("rider_id", rider.id)
      .in("status", ["requested", "approved"])
      .limit(1);

    if (existing?.length) {
      return jsonResponse({ error: "You already have a withdrawal being processed." }, 409);
    }

    const { data: payout, error } = await supabase
      .from("rider_payouts")
      .insert({
        rider_id: rider.id,
        settlement_period: period ?? new Date().toISOString().slice(0, 10),
        amount: balance,
        currency: pricing?.currency ?? "NGN",
        status: "requested",
        bank_details: bankDetails,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return jsonResponse({ success: true, payout, balance });
  } catch (error) {
    console.error("[ovapass-request-payout]", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
