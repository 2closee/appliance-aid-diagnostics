import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const clientIP = getClientIP(req);
  const rl = checkRateLimit(`verify-otp:${clientIP}`, { windowMs: 60_000, maxRequests: 10 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt, corsHeaders);

  try {
    const { delivery_id, otp, phase } = await req.json();
    if (!delivery_id || !otp || !["pickup", "return"].includes(phase)) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: delivery, error } = await supa
      .from("delivery_requests")
      .select("id, pickup_otp, return_otp, pickup_otp_verified_at, return_otp_verified_at")
      .eq("id", delivery_id)
      .maybeSingle();

    if (error || !delivery) {
      return new Response(JSON.stringify({ error: "Delivery not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = phase === "pickup" ? delivery.pickup_otp : delivery.return_otp;
    if (!expected || String(expected) !== String(otp)) {
      return new Response(JSON.stringify({ error: "Invalid OTP" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update = phase === "pickup"
      ? { pickup_otp_verified_at: new Date().toISOString() }
      : { return_otp_verified_at: new Date().toISOString() };

    await supa.from("delivery_requests").update(update).eq("id", delivery_id);

    return new Response(JSON.stringify({ success: true, phase }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
