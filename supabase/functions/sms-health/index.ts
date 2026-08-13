import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isValidSenderId } from "../_shared/sms/termii.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Admin-only SMS credential health check.
 * Calls Termii's balance endpoint — validates the API key without sending an SMS.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await anon.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await supa.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const apiKey = Deno.env.get("TERMII_API_KEY");
    const senderId = Deno.env.get("TERMII_SENDER_ID");
    const twilioConfigured =
      !!Deno.env.get("TWILIO_ACCOUNT_SID") && !!Deno.env.get("TWILIO_AUTH_TOKEN");

    const senderIdValid = isValidSenderId(senderId);

    if (!apiKey || !senderId) {
      return json({
        termii: { configured: false, error: "TERMII_API_KEY or TERMII_SENDER_ID is missing" },
        twilio_fallback_configured: twilioConfigured,
      });
    }

    if (!senderIdValid) {
      return json({
        termii: {
          configured: true,
          sender_id: senderId,
          sender_id_valid: false,
          error:
            "TERMII_SENDER_ID must be the approved sender name (3-11 characters, e.g. \"FixBudi\"), not the dashboard UUID.",
        },
        twilio_fallback_configured: twilioConfigured,
      });
    }


    const res = await fetch(
      `https://api.ng.termii.com/api/get-balance?api_key=${encodeURIComponent(apiKey)}`,
    );
    const text = await res.text();
    if (!res.ok) {
      console.error(`Termii balance check failed [${res.status}]: ${text}`);
      return json({
        termii: { configured: true, key_valid: false, status: res.status, details: text },
        twilio_fallback_configured: twilioConfigured,
      });
    }

    let parsed: { balance?: number; currency?: string; user?: string } = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      return json({
        termii: { configured: true, key_valid: false, details: text.slice(0, 200) },
        twilio_fallback_configured: twilioConfigured,
      });
    }

    return json({
      termii: {
        configured: true,
        key_valid: true,
        sender_id: senderId,
        sender_id_valid: true,
        account: parsed.user,

        balance: parsed.balance,
        currency: parsed.currency,
      },
      twilio_fallback_configured: twilioConfigured,
    });
  } catch (e) {
    console.error("sms-health error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
