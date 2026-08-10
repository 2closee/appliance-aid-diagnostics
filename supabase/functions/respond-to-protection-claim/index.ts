import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ACTIONS = ["accept", "contest", "resolve", "reject"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

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

    const { claim_id, action, notes, logistics_cost } = (await req.json()) ?? {};
    if (!claim_id || typeof claim_id !== "string") return json({ error: "claim_id is required" }, 400);
    if (!ALLOWED_ACTIONS.includes(action as Action)) {
      return json({ error: `action must be one of ${ALLOWED_ACTIONS.join(", ")}` }, 400);
    }
    if (notes && (typeof notes !== "string" || notes.length > 4000)) {
      return json({ error: "notes too long" }, 400);
    }

    const { data: claim, error: claimError } = await supabase
      .from("protection_claims")
      .select("*, plan:repair_protection_plans(*)")
      .eq("id", claim_id)
      .maybeSingle();

    if (claimError || !claim) return json({ error: "Claim not found" }, 404);

    // Authorisation: centre staff for this claim, or an admin
    const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
      claim.repair_center_id
        ? supabase.rpc("is_staff_at_center", { _user_id: user.id, _center_id: claim.repair_center_id })
        : Promise.resolve({ data: false }),
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    ]);

    if (!isStaff && !isAdmin) return json({ error: "Not authorised for this claim" }, 403);
    if (["resolved", "rejected"].includes(claim.status)) {
      return json({ error: "This claim is already closed." }, 400);
    }
    if ((action === "reject" || action === "resolve") && !isAdmin && action === "reject") {
      return json({ error: "Only FixBudi support can reject a claim." }, 403);
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {};

    if (action === "accept") {
      update.status = "center_accepted";
      update.center_response_notes = notes ?? null;
      update.center_responded_at = now;
    } else if (action === "contest") {
      update.status = "in_mediation";
      update.center_response_notes = notes ?? null;
      update.center_responded_at = now;
    } else if (action === "resolve") {
      update.status = "resolved";
      update.resolved_at = now;
      if (isAdmin) update.admin_notes = notes ?? null;
    } else if (action === "reject") {
      update.status = "rejected";
      update.resolved_at = now;
      update.admin_notes = notes ?? null;
    }

    const cost = Number(logistics_cost ?? 0);
    if (cost > 0) update.logistics_cost_paid = Number(claim.logistics_cost_paid ?? 0) + cost;

    const { data: updated, error: updateError } = await supabase
      .from("protection_claims")
      .update(update)
      .eq("id", claim_id)
      .select()
      .single();

    if (updateError) return json({ error: updateError.message }, 500);

    // Accepted: the fund pays the movement — book it and count the claim
    if (action === "accept") {
      await supabase.from("repair_protection_plans").update({
        claims_used: Number(claim.plan?.claims_used ?? 0) + 1,
        status:
          Number(claim.plan?.claims_used ?? 0) + 1 >= Number(claim.plan?.max_claims ?? 2)
            ? "exhausted"
            : "active",
      }).eq("id", claim.plan_id);

      // Return the device to the centre at no cost to the customer
      const { data: delivery, error: deliveryError } = await supabase.functions.invoke(
        "create-delivery",
        {
          body: {
            repair_job_id: claim.repair_job_id,
            delivery_type: "pickup",
            notes: `Warranty claim ${claim.id} — same fault returned. Logistics funded by FixBudi Repair Protection.`,
          },
          headers: { Authorization: authHeader },
        }
      );

      if (deliveryError) {
        console.error("[RESPOND-PROTECTION-CLAIM] delivery dispatch failed", deliveryError.message);
      } else if (delivery?.delivery_request_id ?? delivery?.id) {
        await supabase
          .from("protection_claims")
          .update({ pickup_delivery_id: delivery.delivery_request_id ?? delivery.id, status: "in_repair" })
          .eq("id", claim_id);
      }

      if (cost > 0) {
        await supabase.from("protection_ledger").insert({
          plan_id: claim.plan_id,
          claim_id: claim.id,
          entry_type: "claim_logistics_paid",
          amount: cost,
          notes: "Warranty claim pickup funded from protection reserve",
        });
      }
    }

    await supabase.from("notifications").insert({
      user_id: claim.user_id,
      title:
        action === "accept"
          ? "Warranty claim accepted"
          : action === "contest"
          ? "Warranty claim under review"
          : action === "resolve"
          ? "Warranty claim resolved"
          : "Warranty claim declined",
      message:
        action === "accept"
          ? "Your repair centre accepted the claim. A rider will collect your device at no cost to you."
          : action === "contest"
          ? "Your repair centre contested the claim. FixBudi support is now reviewing it."
          : action === "resolve"
          ? "Your warranty claim has been closed as resolved."
          : notes ?? "Your warranty claim was declined after review.",
      type: "protection_claim",
      related_id: claim.id,
    });

    console.log("[RESPOND-PROTECTION-CLAIM]", { claim_id, action });
    return json({ success: true, claim: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[RESPOND-PROTECTION-CLAIM]", message);
    return json({ error: message }, 500);
  }
});
