import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    const user = userRes?.user;
    if (!user) throw new Error("Not authenticated");

    const body = await req.json();
    const { delivery_request_id, rating, professionalism, punctuality, comment } = body;
    if (!delivery_request_id || !rating) throw new Error("Missing fields");

    const { data: delivery } = await supa
      .from("delivery_requests")
      .select("id, repair_job_id, provider_name")
      .eq("id", delivery_request_id)
      .maybeSingle();
    if (!delivery) throw new Error("Delivery not found");

    const { error } = await supa.from("rider_ratings").insert({
      delivery_request_id,
      repair_job_id: delivery.repair_job_id,
      provider_name: delivery.provider_name,
      rating,
      professionalism,
      punctuality,
      comment,
      created_by: user.id,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
