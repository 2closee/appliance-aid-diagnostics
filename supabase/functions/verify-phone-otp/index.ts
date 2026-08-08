import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
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

const MAX_ATTEMPTS = 5;

async function hashCode(phone: string, code: string) {
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const data = new TextEncoder().encode(`${phone}:${code}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const clientIP = getClientIP(req);
  const rl = checkRateLimit(`verify-phone-otp:${clientIP}`, {
    windowMs: 10 * 60 * 1000,
    maxRequests: 30,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt, corsHeaders);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await anon.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Sign in required" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const phone = normalizeNigerianPhone(String(body?.phone ?? ""));
    const code = String(body?.code ?? "").trim();
    if (!phone || !/^\d{6}$/.test(code)) {
      return json({ error: "Enter the 6-digit code we sent you." }, 400);
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: record } = await supa
      .from("phone_verifications")
      .select("id, code_hash, attempts, expires_at")
      .eq("phone", phone)
      .eq("user_id", userId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) return json({ error: "Request a new code to continue." }, 400);

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await supa
        .from("phone_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", record.id);
      return json({ error: "That code has expired. Request a new one." }, 400);
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await supa
        .from("phone_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", record.id);
      return json({ error: "Too many wrong attempts. Request a new code." }, 429);
    }

    const expected = await hashCode(phone, code);
    if (!timingSafeEqual(expected, record.code_hash)) {
      await supa
        .from("phone_verifications")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);
      return json(
        {
          error: "That code is not correct.",
          attempts_left: MAX_ATTEMPTS - (record.attempts + 1),
        },
        400,
      );
    }

    const verifiedAt = new Date().toISOString();

    await supa
      .from("phone_verifications")
      .update({ consumed_at: verifiedAt })
      .eq("id", record.id);

    await supa
      .from("profiles")
      .update({ phone, phone_verified_at: verifiedAt })
      .eq("id", userId);

    // Keep an existing rider profile in sync so dispatch can trust the number.
    await supa
      .from("riders")
      .update({ phone, phone_verified_at: verifiedAt })
      .eq("user_id", userId);

    return json({ verified: true, phone, verified_at: verifiedAt });
  } catch (e) {
    console.error("verify-phone-otp error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
