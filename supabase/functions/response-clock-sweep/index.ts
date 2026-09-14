import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rankCenters } from "../_shared/centerRanking.ts";
import { handoffDiagnosticToCenter } from "../_shared/diagnosticHandoff.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Caller must be the scheduled job (shared internal secret), the service
    // role, or a signed-in admin running it manually.
    const secret = req.headers.get("x-push-secret");
    let authorized = false;
    if (secret) {
      const { data } = await admin.rpc("verify_push_secret", { _secret: secret });
      authorized = data === true;
    }
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!authorized && token) {
      if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        authorized = true;
      } else {
        const { data: userData } = await admin.auth.getUser(token);
        if (userData.user) {
          const { data: isAdmin } = await admin.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          authorized = isAdmin === true;
        }
      }
    }
    if (!authorized) return json({ error: "Unauthorized" }, 403);

    const { data: dueClocks, error } = await admin
      .from("center_response_clocks")
      .select("*")
      .eq("status", "running")
      .lte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
      .limit(20);
    if (error) throw error;

    const results: unknown[] = [];

    for (const clock of dueClocks ?? []) {
      // A price or inspection request may have landed since; double-check the job.
      const { data: job } = clock.repair_job_id || clock.conversation_id
        ? await admin
          .from("repair_jobs")
          .select("id, quoted_cost, inspection_only, job_status")
          .eq(clock.repair_job_id ? "id" : "conversation_id", clock.repair_job_id ?? clock.conversation_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        : { data: null };

      const answered = Boolean(job && (job.quoted_cost != null || job.inspection_only === true));
      if (answered) {
        await admin
          .from("center_response_clocks")
          .update({ status: "answered", answered_at: new Date().toISOString(), repair_job_id: job!.id })
          .eq("id", clock.id);
        results.push({ clock: clock.id, outcome: "answered_in_time" });
        continue;
      }

      // Who has already had their hour on this request chain?
      const { data: attempts } = await admin
        .from("center_response_clocks")
        .select("repair_center_id, attempt_number")
        .eq("request_key", clock.request_key);
      const tried = (attempts ?? []).map((a: { repair_center_id: number }) => Number(a.repair_center_id));
      const nextAttempt = Math.max(
        ...(attempts ?? [{ attempt_number: clock.attempt_number }]).map((a: { attempt_number: number }) =>
          Number(a.attempt_number)
        ),
      ) + 1;

      // Rebuild the diagnosis context from the conversation we are leaving.
      const { data: conversation } = await admin
        .from("conversations")
        .select("id, customer_id, ai_brief, ai_transcript, diagnostic_summary, diagnostic_conversation_id")
        .eq("id", clock.conversation_id)
        .maybeSingle();

      const transcript = conversation?.ai_transcript ?? {};
      const appliance = (transcript.appliance || "device").toString();
      const diagnosis = (conversation?.diagnostic_summary || conversation?.ai_brief || "").toString();

      // Customer area hint for proximity ranking.
      const { data: address } = await admin
        .from("saved_addresses")
        .select("city, state")
        .eq("user_id", clock.customer_id)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      const area = [address?.city, address?.state].filter(Boolean).join(" ");

      const candidates = await rankCenters(admin, {
        applianceType: appliance,
        diagnosis,
        area,
        limit: 1,
        onlineOnly: true,
        exclude: tried,
      });
      const next = candidates[0];

      if (!next) {
        // Keep the chain open and try again on the next sweep.
        if (!clock.no_candidate_notified) {
          await admin.from("notifications").insert({
            user_id: clock.customer_id,
            title: "Still looking for a repair centre",
            message:
              "No other centre is free right now — we're still looking and will connect you as soon as one comes online.",
            type: "info",
            related_entity_type: "conversation",
            related_entity_id: clock.conversation_id,
          });
          await admin
            .from("center_response_clocks")
            .update({ no_candidate_notified: true })
            .eq("id", clock.id);
        }
        results.push({ clock: clock.id, outcome: "no_candidate" });
        continue;
      }

      // Close the missed centre out.
      await admin
        .from("center_response_clocks")
        .update({ status: "expired", handed_off_to: next.id })
        .eq("id", clock.id);

      if (clock.conversation_id) {
        await admin
          .from("conversations")
          .update({ status: "missed", handoff_reason: "response_timeout" })
          .eq("id", clock.conversation_id);

        await admin.from("messages").insert({
          conversation_id: clock.conversation_id,
          sender_id: clock.customer_id,
          sender_type: "repair_center",
          content:
            "No price was sent within the hour, so this request has been passed to another repair centre.",
          is_auto_reply: true,
        });
      }

      const { data: staff } = await admin
        .from("repair_center_staff")
        .select("user_id")
        .eq("repair_center_id", clock.repair_center_id)
        .eq("is_active", true);
      for (const s of staff ?? []) {
        if (!s.user_id) continue;
        await admin.from("notifications").insert({
          user_id: s.user_id,
          title: "Request passed to another centre",
          message: "The hour ran out before you sent a price, so this repair request moved on.",
          type: "alert",
          related_entity_type: "conversation",
          related_entity_id: clock.conversation_id,
        });
      }

      // Hand the whole diagnosis over — the customer never repeats it.
      const handoff = await handoffDiagnosticToCenter(admin, {
        customerId: clock.customer_id,
        repairCenterId: next.id,
        appliance,
        diagnosis,
        report: transcript.report ?? null,
        transcript: Array.isArray(transcript.messages) ? transcript.messages : [],
        diagnosticConversationId: clock.diagnostic_conversation_id ?? conversation?.diagnostic_conversation_id ?? null,
        attachments: transcript.attachments ?? null,
        requestKey: clock.request_key,
        attemptNumber: nextAttempt,
        brief: conversation?.ai_brief ?? null,
        handoffReason: "response_timeout",
      });

      await admin.from("notifications").insert({
        user_id: clock.customer_id,
        title: `Moved to ${next.name}`,
        message:
          `The first centre did not respond in time, so your diagnosis was sent to ${next.name}. They have one hour to reply — no need to explain the fault again.`,
        type: "alert",
        related_entity_type: "conversation",
        related_entity_id: handoff.conversationId,
      });

      results.push({
        clock: clock.id,
        outcome: "handed_off",
        to: next.id,
        conversation_id: handoff.conversationId,
      });
    }

    return json({ checked: (dueClocks ?? []).length, results });
  } catch (e) {
    console.error("response-clock-sweep error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
