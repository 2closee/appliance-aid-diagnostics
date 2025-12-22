import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Upload a logo image to Supabase Storage so emails can load it.
// Usage (POST JSON): { "sourceUrl": "https://.../logo.png" }
// Uploads to: repair-center-branding/fixbudi-logo.png

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const sourceUrl = body?.sourceUrl as string | undefined;

    if (!sourceUrl) {
      return new Response(
        JSON.stringify({
          error:
            "Missing sourceUrl. Provide a public PNG/JPG URL, e.g. { \"sourceUrl\": \"https://example.com/logo.png\" }",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Fetching logo from:", sourceUrl);

    const fetchRes = await fetch(sourceUrl);
    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch sourceUrl (${fetchRes.status})`);
    }

    const contentType = fetchRes.headers.get("content-type") || "image/png";
    const arrayBuf = await fetchRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Uploading logo to storage as fixbudi-logo.png (contentType:", contentType, ")");

    const { error } = await supabase.storage
      .from("repair-center-branding")
      .upload("fixbudi-logo.png", bytes, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("repair-center-branding")
      .getPublicUrl("fixbudi-logo.png");

    return new Response(
      JSON.stringify({ success: true, url: urlData.publicUrl }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error uploading logo:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
