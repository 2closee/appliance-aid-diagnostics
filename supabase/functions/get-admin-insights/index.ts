import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const minutesBetween = (a: string | null, b: string | null) => {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
};

const median = (values: number[]) => {
  if (!values.length) return null;
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body.action ?? "overview";

    // ---- shared datasets -------------------------------------------------
    const [{ data: profiles }, { data: jobs }, { data: centers }] = await Promise.all([
      admin.from("profiles").select("id, full_name, email, phone, created_at, is_suspended").order("created_at", { ascending: false }),
      admin.from("repair_jobs").select("*").order("created_at", { ascending: false }),
      admin.from("Repair Center").select("id, name, phone, email, status, average_rating, total_reviews, deleted_at"),
    ]);

    const centerName = (id: number | null) =>
      centers?.find((c) => Number(c.id) === Number(id))?.name ?? null;

    if (action === "customer") {
      const customerId: string = body.customer_id;
      if (!customerId) return json({ error: "customer_id is required" }, 400);

      const [
        { data: profile },
        { data: diagnostics },
        { data: conversations },
        { data: tickets },
        { data: events },
      ] = await Promise.all([
        admin.from("profiles").select("*").eq("id", customerId).maybeSingle(),
        admin.from("diagnostic_conversations").select("*").eq("user_id", customerId).order("created_at", { ascending: false }),
        admin.from("conversations").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
        admin.from("support_tickets").select("*").eq("user_id", customerId).order("created_at", { ascending: false }),
        admin.from("analytics_events").select("event_name, path, referrer, metadata, created_at").eq("user_id", customerId).order("created_at", { ascending: false }).limit(300),
      ]);

      const myJobs = (jobs ?? []).filter((j) => j.user_id === customerId);
      const jobIds = myJobs.map((j) => j.id);
      const convIds = (conversations ?? []).map((c) => c.id);

      const [{ data: messages }, { data: trips }, { data: payments }] = await Promise.all([
        convIds.length
          ? admin.from("messages").select("id, conversation_id, sender_type, content, created_at").in("conversation_id", convIds).order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
        jobIds.length
          ? admin.from("overpass_trips").select("*").in("repair_job_id", jobIds)
          : Promise.resolve({ data: [] as any[] }),
        jobIds.length
          ? admin.from("payments").select("*").in("repair_job_id", jobIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // Centre responsiveness per conversation
      const conversationStats = (conversations ?? []).map((c) => {
        const msgs = (messages ?? []).filter((m) => m.conversation_id === c.id);
        const firstCustomer = msgs.find((m) => m.sender_type === "customer");
        const firstCenter = msgs.find((m) => m.sender_type !== "customer");
        return {
          ...c,
          center_name: centerName(c.repair_center_id),
          message_count: msgs.length,
          last_message_at: msgs.length ? msgs[msgs.length - 1].created_at : null,
          center_replied: !!firstCenter,
          first_reply_minutes: minutesBetween(firstCustomer?.created_at ?? null, firstCenter?.created_at ?? null),
        };
      });

      const latestTrip = (trips ?? []).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null;

      // Blocking reason
      let blocker: string | null = null;
      const waitingConv = conversationStats.find((c) => !c.center_replied && c.message_count > 0);
      const unquoted = myJobs.find((j) => !j.quoted_cost && !["completed", "cancelled"].includes(j.job_status));
      const unassignedTrip = (trips ?? []).find((t) => !t.rider_id && ["pending", "searching"].includes(t.status));
      if (waitingConv) blocker = `Waiting for ${waitingConv.center_name ?? "the repair centre"} to reply to their message`;
      else if (unquoted) blocker = `Waiting for ${centerName(unquoted.repair_center_id) ?? "a repair centre"} to send a price`;
      else if (unassignedTrip) blocker = "Pickup requested but no rider has accepted yet";
      else if (!myJobs.length && (diagnostics?.length ?? 0) > 0) blocker = "Ran a diagnosis but never engaged a repair centre";
      else if (!myJobs.length && !diagnostics?.length) blocker = "Signed up but has not started a diagnosis yet";

      return json({
        profile,
        blocker,
        jobs: myJobs.map((j) => ({ ...j, center_name: centerName(j.repair_center_id) })),
        diagnostics: diagnostics ?? [],
        conversations: conversationStats,
        trips: trips ?? [],
        payments: payments ?? [],
        tickets: tickets ?? [],
        events: events ?? [],
        last_location: latestTrip
          ? {
              pickup_address: latestTrip.pickup_address,
              lat: latestTrip.pickup_lat,
              lng: latestTrip.pickup_lng,
              at: latestTrip.created_at,
              trip_status: latestTrip.status,
            }
          : null,
      });
    }

    if (action === "centers") {
      const [{ data: activity }, { data: nudges }, { data: staff }, { data: allConvs }] = await Promise.all([
        admin.from("center_activity").select("*"),
        admin.from("center_nudges").select("*").order("sent_at", { ascending: false }).limit(200),
        admin.from("repair_center_staff").select("repair_center_id, user_id, is_active").eq("is_active", true),
        admin.from("conversations").select("id, repair_center_id, customer_id, created_at"),
      ]);

      const convIds = (allConvs ?? []).map((c) => c.id);
      const { data: messages } = convIds.length
        ? await admin.from("messages").select("conversation_id, sender_type, created_at").in("conversation_id", convIds).order("created_at", { ascending: true })
        : { data: [] as any[] };

      const rows = (centers ?? [])
        .filter((c) => !c.deleted_at)
        .map((c) => {
          const acts = (activity ?? []).filter((a) => Number(a.repair_center_id) === Number(c.id));
          const lastSeen = acts.map((a) => a.last_seen_at).sort().reverse()[0] ?? null;
          const centerJobs = (jobs ?? []).filter((j) => Number(j.repair_center_id) === Number(c.id));
          const centerConvs = (allConvs ?? []).filter((x) => Number(x.repair_center_id) === Number(c.id));

          const replyTimes: number[] = [];
          let unanswered = 0;
          for (const conv of centerConvs) {
            const msgs = (messages ?? []).filter((m) => m.conversation_id === conv.id);
            const firstCustomer = msgs.find((m) => m.sender_type === "customer");
            const firstCenter = msgs.find((m) => m.sender_type !== "customer");
            const mins = minutesBetween(firstCustomer?.created_at ?? null, firstCenter?.created_at ?? null);
            if (mins !== null) replyTimes.push(mins);
            else if (firstCustomer) unanswered += 1;
          }

          const quoteTimes = centerJobs
            .map((j) => minutesBetween(j.created_at, j.quote_provided_at))
            .filter((m): m is number => m !== null);

          const waitingJobs = centerJobs.filter(
            (j) => !j.quoted_cost && !["completed", "cancelled"].includes(j.job_status),
          ).length;

          return {
            id: c.id,
            name: c.name,
            phone: c.phone,
            status: c.status,
            rating: c.average_rating,
            reviews: c.total_reviews,
            staff_count: (staff ?? []).filter((s) => Number(s.repair_center_id) === Number(c.id)).length,
            last_seen_at: lastSeen,
            online_now: lastSeen ? Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000 : false,
            open_jobs: centerJobs.filter((j) => !["completed", "cancelled"].includes(j.job_status)).length,
            waiting_for_quote: waitingJobs,
            unanswered_conversations: unanswered,
            median_first_reply_minutes: median(replyTimes),
            median_quote_minutes: median(quoteTimes),
            jobs_total: centerJobs.length,
            jobs_completed: centerJobs.filter((j) => j.job_status === "completed").length,
            nudges_sent: (nudges ?? []).filter((n) => Number(n.repair_center_id) === Number(c.id)).length,
          };
        });

      return json({ centers: rows, nudges: nudges ?? [] });
    }

    // ---- overview --------------------------------------------------------
    const { data: events } = await admin
      .from("analytics_events")
      .select("event_name, user_id, session_id, path, referrer, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    const { data: conversations } = await admin.from("conversations").select("id, repair_center_id, customer_id, created_at");
    const convIds = (conversations ?? []).map((c) => c.id);
    const { data: messages } = convIds.length
      ? await admin.from("messages").select("conversation_id, sender_type, created_at").in("conversation_id", convIds).order("created_at", { ascending: true })
      : { data: [] as any[] };
    const { data: diagnostics } = await admin.from("diagnostic_conversations").select("id, user_id, appliance_type, created_at");
    const { data: trips } = await admin.from("overpass_trips").select("id, repair_job_id, rider_id, status, created_at");
    const { data: tickets } = await admin.from("support_tickets").select("id, user_id, subject, status, created_at");
    const { data: payments } = await admin.from("payments").select("id, repair_job_id, payment_status, amount, created_at");

    const eventCount = (name: string) => (events ?? []).filter((e) => e.event_name === name).length;
    const uniqueUsers = (name: string) =>
      new Set((events ?? []).filter((e) => e.event_name === name && e.user_id).map((e) => e.user_id)).size;

    // signup trend by day (last 30 days)
    const byDay: Record<string, number> = {};
    for (const p of profiles ?? []) {
      const d = (p.created_at as string).slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + 1;
    }
    const signupTrend = Object.entries(byDay)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));

    const jobsList = jobs ?? [];
    const funnel = [
      { step: "Signed up", count: (profiles ?? []).length },
      { step: "Started a diagnosis", count: new Set((diagnostics ?? []).map((d) => d.user_id)).size },
      { step: "Finished a self-test", count: uniqueUsers("CompleteSelfTest") || eventCount("CompleteSelfTest") },
      { step: "Engaged a repair centre", count: new Set(jobsList.map((j) => j.user_id)).size },
      { step: "Conversation started", count: new Set((conversations ?? []).map((c) => c.customer_id)).size },
      { step: "Got a price", count: new Set(jobsList.filter((j) => j.quoted_cost).map((j) => j.user_id)).size },
      { step: "Accepted a price", count: new Set(jobsList.filter((j) => j.quote_accepted_at).map((j) => j.user_id)).size },
      { step: "Pickup arranged", count: new Set((trips ?? []).map((t) => t.repair_job_id)).size },
      { step: "Job completed", count: jobsList.filter((j) => j.job_status === "completed").length },
    ];

    // friction list
    const friction: any[] = [];
    const nameOf = (userId: string | null) => {
      const p = (profiles ?? []).find((x) => x.id === userId);
      return p?.full_name || p?.email || "Unknown customer";
    };
    const hoursSince = (ts: string) => Math.round((Date.now() - new Date(ts).getTime()) / 3600000);

    for (const conv of conversations ?? []) {
      const msgs = (messages ?? []).filter((m) => m.conversation_id === conv.id);
      const firstCustomer = msgs.find((m) => m.sender_type === "customer");
      const anyCenter = msgs.some((m) => m.sender_type !== "customer");
      if (firstCustomer && !anyCenter) {
        friction.push({
          type: "Centre never replied",
          customer_id: conv.customer_id,
          customer: nameOf(conv.customer_id),
          center: centerName(conv.repair_center_id),
          waiting_hours: hoursSince(firstCustomer.created_at),
          at: firstCustomer.created_at,
        });
      }
    }
    for (const j of jobsList) {
      if (!j.quoted_cost && !["completed", "cancelled"].includes(j.job_status)) {
        friction.push({
          type: "Price never given",
          customer_id: j.user_id,
          customer: nameOf(j.user_id),
          center: centerName(j.repair_center_id),
          waiting_hours: hoursSince(j.created_at),
          at: j.created_at,
          detail: `${j.appliance_type ?? "Device"} — ${j.issue_description ?? "no description"}`,
        });
      }
      if (j.quote_expires_at && !j.quote_accepted_at && new Date(j.quote_expires_at) < new Date()) {
        friction.push({
          type: "Price expired unanswered",
          customer_id: j.user_id,
          customer: nameOf(j.user_id),
          center: centerName(j.repair_center_id),
          waiting_hours: hoursSince(j.quote_expires_at),
          at: j.quote_expires_at,
        });
      }
    }
    for (const t of trips ?? []) {
      if (!t.rider_id && ["pending", "searching"].includes(t.status)) {
        const job = jobsList.find((j) => j.id === t.repair_job_id);
        friction.push({
          type: "No rider found",
          customer_id: job?.user_id ?? null,
          customer: nameOf(job?.user_id ?? null),
          center: centerName(job?.repair_center_id ?? null),
          waiting_hours: hoursSince(t.created_at),
          at: t.created_at,
        });
      }
    }
    for (const p of payments ?? []) {
      if (p.payment_status === "failed") {
        const job = jobsList.find((j) => j.id === p.repair_job_id);
        friction.push({
          type: "Payment failed",
          customer_id: job?.user_id ?? null,
          customer: nameOf(job?.user_id ?? null),
          center: centerName(job?.repair_center_id ?? null),
          waiting_hours: hoursSince(p.created_at),
          at: p.created_at,
        });
      }
    }
    for (const t of tickets ?? []) {
      if (["open", "in_progress"].includes(t.status)) {
        friction.push({
          type: "Support ticket open",
          customer_id: t.user_id,
          customer: nameOf(t.user_id),
          center: null,
          waiting_hours: hoursSince(t.created_at),
          at: t.created_at,
          detail: t.subject,
        });
      }
    }
    // customers who signed up and did nothing
    for (const p of profiles ?? []) {
      const hasDiag = (diagnostics ?? []).some((d) => d.user_id === p.id);
      const hasJob = jobsList.some((j) => j.user_id === p.id);
      if (!hasDiag && !hasJob) {
        friction.push({
          type: "Signed up, never used a service",
          customer_id: p.id,
          customer: p.full_name || p.email || "Unknown customer",
          center: null,
          waiting_hours: hoursSince(p.created_at),
          at: p.created_at,
        });
      }
    }
    friction.sort((a, b) => (b.waiting_hours ?? 0) - (a.waiting_hours ?? 0));

    // per-customer progress for the signups table
    const customers = (profiles ?? []).map((p) => {
      const myJobs = jobsList.filter((j) => j.user_id === p.id);
      const myEvents = (events ?? []).filter((e) => e.user_id === p.id);
      const firstEvent = myEvents[myEvents.length - 1];
      let stage = "Signed up";
      if ((diagnostics ?? []).some((d) => d.user_id === p.id)) stage = "Ran a diagnosis";
      if (myJobs.length) stage = "Engaged a centre";
      if (myJobs.some((j) => j.quoted_cost)) stage = "Got a price";
      if (myJobs.some((j) => j.quote_accepted_at)) stage = "Accepted a price";
      if (myJobs.some((j) => j.job_status === "completed")) stage = "Completed a repair";
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        created_at: p.created_at,
        is_suspended: p.is_suspended,
        stage,
        jobs: myJobs.length,
        centers: [...new Set(myJobs.map((j) => centerName(j.repair_center_id)).filter(Boolean))],
        first_path: firstEvent?.path ?? null,
        referrer: firstEvent?.referrer ?? null,
        events: myEvents.length,
      };
    });

    // feature usage
    const usageMap: Record<string, { users: Set<string>; count: number }> = {};
    for (const e of events ?? []) {
      if (e.event_name === "page_view") continue;
      usageMap[e.event_name] ??= { users: new Set(), count: 0 };
      usageMap[e.event_name].count += 1;
      if (e.user_id) usageMap[e.event_name].users.add(e.user_id);
    }
    const featureUsage = Object.entries(usageMap)
      .map(([event_name, v]) => ({ event_name, count: v.count, users: v.users.size }))
      .sort((a, b) => b.count - a.count);

    return json({
      totals: {
        customers: (profiles ?? []).length,
        new_last_7_days: (profiles ?? []).filter((p) => Date.now() - new Date(p.created_at).getTime() < 7 * 864e5).length,
        diagnostics: (diagnostics ?? []).length,
        jobs: jobsList.length,
        quotes_given: jobsList.filter((j) => j.quoted_cost).length,
        completed: jobsList.filter((j) => j.job_status === "completed").length,
        open_friction: friction.length,
      },
      signupTrend,
      funnel,
      friction: friction.slice(0, 200),
      customers,
      featureUsage,
    });
  } catch (e) {
    console.error("get-admin-insights error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
