import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Maps a notification's related entity onto an in-app route. */
const pathFor = (entityType: string | null, entityId: string | null): string => {
  if (!entityId) return "/dashboard";
  switch (entityType) {
    case "conversation":
      return `/repair-center-chat/${entityId}`;
    case "repair_job":
      return `/repair-jobs/${entityId}`;
    case "support_ticket":
      return `/support-tickets/${entityId}`;
    case "ovapass_trip":
      return "/rider";
    default:
      return "/dashboard";
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const connectionKey = Deno.env.get("FIREBASE_MESSAGING_API_KEY");

    if (!supabaseUrl || !serviceKey) return json({ error: "Supabase env missing" }, 500);
    if (!lovableKey || !connectionKey) {
      return json({ error: "Firebase Cloud Messaging connection is not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const notificationId = typeof body?.notification_id === "string" ? body.notification_id : null;

    // Authenticate: either the database trigger's shared secret, or a signed-in user
    // pushing a test notification to their own devices.
    const providedSecret = req.headers.get("x-push-secret");
    let authorized = false;
    let callerId: string | null = null;

    if (providedSecret) {
      const { data: secretRow } = await supabase
        .schema("vault")
        .from("decrypted_secrets")
        .select("decrypted_secret")
        .eq("name", "push_dispatch_secret")
        .maybeSingle();
      authorized = !!secretRow?.decrypted_secret && secretRow.decrypted_secret === providedSecret;
    }

    if (!authorized) {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (token) {
        const { data: userData } = await supabase.auth.getUser(token);
        callerId = userData?.user?.id ?? null;
        authorized = !!callerId;
      }
    }

    if (!authorized) return json({ error: "Unauthorized" }, 401);

    let userId: string | null = null;
    let title = "Fixbudi";
    let message = "You have a new update.";
    let path = "/dashboard";

    if (notificationId) {
      const { data: notification, error } = await supabase
        .from("notifications")
        .select("id, user_id, title, message, related_entity_type, related_entity_id")
        .eq("id", notificationId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!notification) return json({ error: "Notification not found" }, 404);
      if (callerId && notification.user_id !== callerId) return json({ error: "Forbidden" }, 403);

      userId = notification.user_id;
      title = notification.title ?? title;
      message = notification.message ?? message;
      path = pathFor(notification.related_entity_type, notification.related_entity_id);
    } else if (callerId) {
      // Test push for the signed-in user.
      userId = callerId;
      title = "Notifications are on";
      message = "You'll now get Fixbudi alerts even when the app is closed.";
    } else {
      return json({ error: "notification_id is required" }, 400);
    }

    const { data: devices } = await supabase
      .from("push_subscriptions")
      .select("id, token")
      .eq("user_id", userId);

    if (!devices?.length) return json({ success: true, sent: 0, reason: "no devices" });

    let sent = 0;
    const stale: string[] = [];

    for (const device of devices) {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connectionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: device.token,
            notification: { title, body: message },
            data: { path },
            webpush: {
              fcm_options: { link: path },
              notification: { icon: "/pwa-192x192.png", badge: "/pwa-192x192.png" },
            },
          },
        }),
      });

      if (res.ok) {
        sent += 1;
        continue;
      }

      const errorBody = await res.text();
      console.error(`[send-push] FCM failed [${res.status}]: ${errorBody}`);
      if (res.status === 404 || res.status === 400) stale.push(device.id);
    }

    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("id", stale);
    }

    return json({ success: true, sent, removed: stale.length });
  } catch (e) {
    console.error(`[send-push] ${(e as Error).message}`);
    return json({ error: (e as Error).message }, 500);
  }
});
