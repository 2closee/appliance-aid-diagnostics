import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHONE_KEYWORDS = ["phone", "smartphone", "iphone", "android", "mobile"];
const LAPTOP_KEYWORDS = ["laptop", "macbook", "notebook", "ultrabook"];

function categorise(applianceType: string | null): "phone" | "laptop" | null {
  if (!applianceType) return null;
  const s = applianceType.toLowerCase().trim();
  if (LAPTOP_KEYWORDS.some((k) => s.includes(k))) return "laptop";
  if (PHONE_KEYWORDS.some((k) => s.includes(k))) return "phone";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: authData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = authData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { repair_job_id } = await req.json();
    if (!repair_job_id || typeof repair_job_id !== "string") {
      return new Response(JSON.stringify({ error: "repair_job_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error: jobError } = await supabase
      .from("repair_jobs")
      .select("id, user_id, appliance_type, final_cost, estimated_cost")
      .eq("id", repair_job_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Repair job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const category = categorise(job.appliance_type);
    const repairCost = Number(job.final_cost ?? job.estimated_cost ?? 0);

    if (!category || repairCost <= 0) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: !category
            ? "Repair Protection is available for phones and laptops only."
            : "The repair cost has not been finalised yet.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already covered?
    const { data: existing } = await supabase
      .from("repair_protection_plans")
      .select("id, status, expires_at")
      .eq("repair_job_id", repair_job_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "This repair is already protected.", plan: existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: tiers } = await supabase
      .from("protection_pricing_tiers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    let fee = 0;
    const tier = (tiers ?? []).find(
      (t: any) =>
        repairCost >= Number(t.min_repair_cost) &&
        (t.max_repair_cost === null || repairCost <= Number(t.max_repair_cost))
    );

    if (tier) {
      if (tier.flat_fee !== null) {
        fee = Number(tier.flat_fee);
      } else {
        fee = Math.round((repairCost * Number(tier.percentage_rate ?? 0)) / 100) * 100;
        if (tier.fee_cap !== null) fee = Math.min(fee, Number(tier.fee_cap));
      }
    }

    if (!fee) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "No protection price is configured for this repair cost." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        eligible: true,
        device_category: category,
        repair_cost: repairCost,
        fee_amount: fee,
        period_days: 90,
        max_claims: 2,
        terms_version: "v1.0",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CALCULATE-PROTECTION-QUOTE]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
