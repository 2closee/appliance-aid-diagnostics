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

// A verified phone only counts as proof of identity for a short window.
const PROOF_WINDOW_MS = 15 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const clientIP = getClientIP(req);
  const rl = checkRateLimit(`rider-signup:${clientIP}`, {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt, corsHeaders);

  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizeNigerianPhone(String(body?.phone ?? ""));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const fullName = String(body?.full_name ?? "").trim();

    if (!phone) {
      return json({ error: "Enter a valid Nigerian mobile number." }, 400);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Enter a valid email address." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Your password must be at least 6 characters." }, 400);
    }
    if (fullName.length < 2) {
      return json({ error: "Enter your full name." }, 400);
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Proof of SMS verification: a recently consumed, pre-account code for this number.
    const { data: proof } = await supa
      .from("phone_verifications")
      .select("id, consumed_at")
      .eq("phone", phone)
      .is("user_id", null)
      .not("consumed_at", "is", null)
      .order("consumed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      !proof?.consumed_at ||
      Date.now() - new Date(proof.consumed_at).getTime() > PROOF_WINDOW_MS
    ) {
      return json({ error: "Verify your phone number again to continue." }, 400);
    }

    const verifiedAt = new Date().toISOString();

    const { data: created, error: createError } = await supa.auth.admin.createUser({
      email,
      password,
      // Riders are trusted through their verified phone number, so no email
      // confirmation link is required for them.
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, signup_source: "ovapass_rider" },
    });

    if (createError || !created?.user) {
      const message = createError?.message ?? "Could not create your account.";
      const exists = /already been registered|already registered|exists/i.test(message);
      return json(
        {
          error: exists
            ? "This email already has an account. Please sign in instead."
            : message,
          email_exists: exists,
        },
        exists ? 409 : 400,
      );
    }

    const userId = created.user.id;

    // Bind the proof to the new account so it cannot be reused for another signup.
    await supa.from("phone_verifications").update({ user_id: userId }).eq("id", proof.id);

    await supa
      .from("profiles")
      .update({ full_name: fullName, phone, phone_verified_at: verifiedAt })
      .eq("id", userId);

    return json({ created: true, user_id: userId, phone, phone_verified_at: verifiedAt });
  } catch (e) {
    console.error("rider-signup error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
