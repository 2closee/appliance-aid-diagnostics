import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sweeps protection plans past their 90-day window: marks them expired and
// releases the unclaimed reserve to platform revenue. Safe to run daily (cron)
// or on demand by an admin.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // A human caller must be an admin; a cron caller uses the service role key.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!isServiceRole) {
      const { data: authData } = await supabase.auth.getUser(token);
      if (!authData.user) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: authData.user.id,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "Admin only" }, 403);
    }

    const now = new Date().toISOString();

    const { data: duePlans, error: dueError } = await supabase
      .from("repair_protection_plans")
      .select("id, fee_amount, claims_used")
      .in("status", ["active", "exhausted"])
      .lt("expires_at", now);

    if (dueError) return json({ error: dueError.message }, 500);

    let released = 0;
    for (const plan of duePlans ?? []) {
      // Total already paid out of this plan's reserve
      const { data: entries } = await supabase
        .from("protection_ledger")
        .select("entry_type, amount")
        .eq("plan_id", plan.id);

      const paidOut = (entries ?? [])
        .filter((e: any) => e.entry_type === "claim_logistics_paid")
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const remainder = Math.max(0, Number(plan.fee_amount) - paidOut);

      await supabase
        .from("repair_protection_plans")
        .update({ status: "expired" })
        .eq("id", plan.id);

      if (remainder > 0) {
        await supabase.from("protection_ledger").insert({
          plan_id: plan.id,
          entry_type: "reserve_released",
          amount: remainder,
          notes: "90-day protection window closed with no further claims — reserve released to revenue",
        });
        released += remainder;
      }
    }

    console.log("[EXPIRE-PROTECTION-PLANS]", { expired: duePlans?.length ?? 0, released });
    return json({ success: true, expired: duePlans?.length ?? 0, released });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[EXPIRE-PROTECTION-PLANS]", message);
    return json({ error: message }, 500);
  }
});
