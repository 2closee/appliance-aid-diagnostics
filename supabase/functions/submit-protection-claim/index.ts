import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: authData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = authData.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { plan_id, reported_fault, description, evidence_urls } = body ?? {};

    if (!plan_id || typeof plan_id !== "string") return json({ error: "plan_id is required" }, 400);
    if (!reported_fault || typeof reported_fault !== "string" || reported_fault.length > 500) {
      return json({ error: "reported_fault is required (max 500 chars)" }, 400);
    }
    if (description && (typeof description !== "string" || description.length > 4000)) {
      return json({ error: "description too long" }, 400);
    }
    const evidence: string[] = Array.isArray(evidence_urls)
      ? evidence_urls.filter((u) => typeof u === "string").slice(0, 10)
      : [];

    const { data: plan, error: planError } = await supabase
      .from("repair_protection_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError || !plan) return json({ error: "Protection plan not found" }, 404);

    if (new Date(plan.expires_at) < new Date()) {
      return json({ error: "This protection plan has expired." }, 400);
    }
    if (plan.status !== "active") {
      return json({ error: `This protection plan is ${plan.status}.` }, 400);
    }
    if (plan.claims_used >= plan.max_claims) {
      return json({ error: "You have used all claims available on this plan." }, 400);
    }

    const { data: openClaim } = await supabase
      .from("protection_claims")
      .select("id")
      .eq("plan_id", plan_id)
      .not("status", "in", '("resolved","rejected")')
      .maybeSingle();

    if (openClaim) return json({ error: "You already have an open claim on this repair." }, 409);

    const { data: claim, error: claimError } = await supabase
      .from("protection_claims")
      .insert({
        plan_id: plan.id,
        repair_job_id: plan.repair_job_id,
        user_id: user.id,
        repair_center_id: plan.repair_center_id,
        reported_fault,
        description: description ?? null,
        evidence_urls: evidence,
        status: "submitted",
      })
      .select()
      .single();

    if (claimError) return json({ error: claimError.message }, 500);

    // Notify the repair centre staff
    if (plan.repair_center_id) {
      const { data: staff } = await supabase
        .from("repair_center_staff")
        .select("user_id")
        .eq("repair_center_id", plan.repair_center_id)
        .eq("is_active", true);

      if (staff?.length) {
        await supabase.from("notifications").insert(
          staff.map((s: { user_id: string }) => ({
            user_id: s.user_id,
            title: "Warranty claim received",
            message: `A customer reported the same fault returning: ${reported_fault}. Respond within 48 hours.`,
            type: "protection_claim",
            related_id: claim.id,
          }))
        );
      }
    }

    console.log("[SUBMIT-PROTECTION-CLAIM] created", { claim_id: claim.id, plan_id });
    return json({ success: true, claim });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SUBMIT-PROTECTION-CLAIM]", message);
    return json({ error: message }, 500);
  }
});
