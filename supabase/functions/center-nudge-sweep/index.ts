import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendSms } from "../_shared/sms/dispatcher.ts";
import { normalizeNigerianPhone } from "../_shared/sms/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Candidate {
  center_id: number;
  reason: string;
  job_id: string | null;
  conversation_id: string | null;
  detail: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body.dry_run === true;

    // Allow either the cron/service caller or a signed-in admin (manual sweep).
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (token && token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const { data: userData } = await admin.auth.getUser(token);
      if (userData.user) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
        if (!isAdmin) return json({ error: "Admin access required" }, 403);
      }
    }

    const { data: settings } = await admin
      .from("admin_alert_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings) return json({ error: "Alert settings missing" }, 500);
    if (!settings.enabled && !dryRun) return json({ skipped: "Nudges are switched off" });

    const lagosHour = Number(
      new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()),
    );
    const withinHours = lagosHour >= settings.working_hours_start && lagosHour < settings.working_hours_end;
    if (!withinHours && !dryRun) return json({ skipped: `Outside working hours (Lagos ${lagosHour}:00)` });

    const now = Date.now();
    const onlineCutoff = new Date(now - settings.online_window_minutes * 60000).toISOString();
    const msgCutoff = new Date(now - settings.message_wait_minutes * 60000).toISOString();
    const quoteCutoff = new Date(now - settings.quote_wait_minutes * 60000).toISOString();

    const [{ data: centers }, { data: activity }, { data: recentNudges }] = await Promise.all([
      admin.from("Repair Center").select("id, name, phone, status, deleted_at"),
      admin.from("center_activity").select("repair_center_id, last_seen_at").gte("last_seen_at", onlineCutoff),
      admin.from("center_nudges").select("repair_center_id, repair_job_id, conversation_id, reason, sent_at").gte("sent_at", new Date(now - 24 * 3600000).toISOString()),
    ]);

    const onlineCenters = new Set((activity ?? []).map((a) => Number(a.repair_center_id)));

    const candidates: Candidate[] = [];

    // 1. Unanswered customer messages
    const { data: conversations } = await admin
      .from("conversations")
      .select("id, repair_center_id, repair_job_id, created_at");
    const convIds = (conversations ?? []).map((c) => c.id);
    const { data: messages } = convIds.length
      ? await admin.from("messages").select("conversation_id, sender_type, content, created_at").in("conversation_id", convIds).order("created_at", { ascending: true })
      : { data: [] as any[] };

    for (const conv of conversations ?? []) {
      const msgs = (messages ?? []).filter((m) => m.conversation_id === conv.id);
      if (!msgs.length) continue;
      const last = msgs[msgs.length - 1];
      if (last.sender_type !== "customer") continue;
      if (last.created_at > msgCutoff) continue;
      candidates.push({
        center_id: Number(conv.repair_center_id),
        reason: "unanswered_message",
        job_id: conv.repair_job_id ?? null,
        conversation_id: conv.id,
        detail: "a customer message is waiting for your reply",
      });
    }

    // 2. Jobs waiting for a price
    const { data: jobs } = await admin
      .from("repair_jobs")
      .select("id, repair_center_id, appliance_type, issue_description, job_status, quoted_cost, created_at")
      .is("quoted_cost", null)
      .not("job_status", "in", "(completed,cancelled)")
      .lte("created_at", quoteCutoff);

    for (const j of jobs ?? []) {
      candidates.push({
        center_id: Number(j.repair_center_id),
        reason: "quote_pending",
        job_id: j.id,
        conversation_id: null,
        detail: `a customer is waiting for your price on a ${j.appliance_type ?? "device"}`,
      });
    }

    const appUrl = Deno.env.get("APP_URL") ?? "https://fixbudi.lovable.app";
    const link = `${appUrl}/partner-login`;
    const results: any[] = [];
    const sentThisRun = new Map<number, number>();

    for (const c of candidates) {
      const center = (centers ?? []).find((x) => Number(x.id) === c.center_id);
      if (!center || center.deleted_at || center.status !== "active") continue;
      if (onlineCenters.has(c.center_id)) {
        results.push({ ...c, skipped: "staff online" });
        continue;
      }

      const already = (recentNudges ?? []).some(
        (n) =>
          Number(n.repair_center_id) === c.center_id &&
          n.reason === c.reason &&
          ((c.job_id && n.repair_job_id === c.job_id) || (c.conversation_id && n.conversation_id === c.conversation_id)),
      );
      if (already) {
        results.push({ ...c, skipped: "already nudged for this case" });
        continue;
      }

      const dayCount =
        (recentNudges ?? []).filter((n) => Number(n.repair_center_id) === c.center_id).length +
        (sentThisRun.get(c.center_id) ?? 0);
      if (dayCount >= settings.max_per_center_per_day) {
        results.push({ ...c, skipped: "daily cap reached" });
        continue;
      }
      const hourCount =
        (recentNudges ?? []).filter(
          (n) => Number(n.repair_center_id) === c.center_id && n.sent_at > new Date(now - 3600000).toISOString(),
        ).length + (sentThisRun.get(c.center_id) ?? 0);
      if (hourCount >= settings.max_per_center_per_hour) {
        results.push({ ...c, skipped: "hourly cap reached" });
        continue;
      }

      const message = String(settings.sms_template)
        .replace("{reason}", c.detail)
        .replace("{center}", center.name ?? "partner")
        .replace("{link}", link);

      if (dryRun) {
        results.push({ ...c, would_send: message, phone: center.phone });
        sentThisRun.set(c.center_id, (sentThisRun.get(c.center_id) ?? 0) + 1);
        continue;
      }

      const phone = normalizeNigerianPhone(center.phone ?? "");
      let sms = { provider: "none", ok: false, error: "No usable phone number on the centre profile" } as any;
      if (phone) sms = await sendSms({ to: phone, body: message });

      await admin.from("center_nudges").insert({
        repair_center_id: c.center_id,
        repair_job_id: c.job_id,
        conversation_id: c.conversation_id,
        reason: c.reason,
        message,
        phone,
        provider: sms.provider,
        provider_ok: sms.ok,
        provider_error: sms.error ?? null,
        outcome: sms.ok ? "sent" : "failed",
      });

      // In-app notification for every active staff member of the centre
      const { data: staff } = await admin
        .from("repair_center_staff")
        .select("user_id")
        .eq("repair_center_id", c.center_id)
        .eq("is_active", true);
      for (const s of staff ?? []) {
        if (!s.user_id) continue;
        await admin.from("notifications").insert({
          user_id: s.user_id,
          title: "A customer is waiting",
          message: `${c.detail}. Open your dashboard to respond.`,
          type: "alert",
          related_entity_type: c.job_id ? "repair_job" : "conversation",
          related_entity_id: c.job_id ?? c.conversation_id,
        });
      }

      sentThisRun.set(c.center_id, (sentThisRun.get(c.center_id) ?? 0) + 1);
      results.push({ ...c, sent: sms.ok, provider: sms.provider, error: sms.error ?? null });
    }

    return json({
      checked: candidates.length,
      sent: results.filter((r) => r.sent).length,
      dry_run: dryRun,
      results,
    });
  } catch (e) {
    console.error("center-nudge-sweep error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
