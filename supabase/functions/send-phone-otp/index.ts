import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { normalizeNigerianPhone } from "../_shared/sms/types.ts";
import { sendSms } from "../_shared/sms/dispatcher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

async function hashCode(phone: string, code: string) {
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const data = new TextEncoder().encode(`${phone}:${code}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const clientIP = getClientIP(req);
  const ipLimit = checkRateLimit(`send-phone-otp:ip:${clientIP}`, {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
  });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetAt, corsHeaders);

  try {
    // Riders verify their phone BEFORE an account exists, so a signed-in user is
    // optional here. When a session is present we tie the code to that user.
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const anon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await anon.auth.getUser();
      userId = userData?.user?.id ?? null;
    }


    const body = await req.json().catch(() => ({}));
    const phone = normalizeNigerianPhone(String(body?.phone ?? ""));
    if (!phone) {
      return json(
        { error: "Enter a valid Nigerian mobile number, for example 0801 234 5678." },
        400,
      );
    }

    const phoneLimit = checkRateLimit(`send-phone-otp:phone:${phone}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    });
    if (!phoneLimit.allowed) return rateLimitResponse(phoneLimit.resetAt, corsHeaders);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Enforce a 60s resend cooldown per phone number.
    const { data: recent } = await supa
      .from("phone_verifications")
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.created_at) {
      const elapsed = Date.now() - new Date(recent.created_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        return json(
          {
            error: "Please wait before requesting another code.",
            retry_after_seconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
          },
          429,
        );
      }
    }

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    const codeHash = await hashCode(phone, code);

    // Invalidate any outstanding codes for this number.
    await supa
      .from("phone_verifications")
      .update({ consumed_at: new Date().toISOString() })
      .eq("phone", phone)
      .is("consumed_at", null);

    const { error: insertError } = await supa.from("phone_verifications").insert({
      phone,
      code_hash: codeHash,
      user_id: userId,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (insertError) throw insertError;

    const sms = await sendSms({
      to: phone,
      body: `Your FixBudi verification code is ${code}. It expires in 10 minutes.`,
    });

    if (!sms.ok) {
      console.error(`SMS delivery failed for ${phone}: ${sms.error}`);
      return json(
        { error: "We could not send the code right now. Please try again shortly." },
        502,
      );
    }

    return json({ sent: true, phone, expires_in_seconds: CODE_TTL_MS / 1000 });
  } catch (e) {
    console.error("send-phone-otp error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
