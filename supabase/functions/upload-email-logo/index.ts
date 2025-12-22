import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple FixBudi logo - black text on white background (SVG converted to PNG-like format)
// Creating a simple branded image programmatically
function createSimpleLogo(): Uint8Array {
  // This is a minimal valid PNG with FixBudi branding colors
  // We'll use a pre-made small logo that works for email
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">
      <rect width="200" height="80" fill="#ffffff"/>
      <rect x="10" y="10" width="60" height="60" rx="10" fill="#1a1a1a"/>
      <text x="45" y="48" font-family="Arial, sans-serif" font-size="24" fill="#ffffff" text-anchor="middle" font-weight="bold">FB</text>
      <text x="140" y="50" font-family="Arial, sans-serif" font-size="24" fill="#1a1a1a" text-anchor="middle" font-weight="bold">FixBudi</text>
    </svg>
  `;
  return new TextEncoder().encode(svgContent);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting logo upload process...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create SVG logo
    const logoBytes = createSimpleLogo();

    console.log("Uploading logo to storage bucket...");

    // Upload to storage bucket as SVG
    const { data, error } = await supabase.storage
      .from("repair-center-branding")
      .upload("fixbudi-logo.svg", logoBytes, {
        contentType: "image/svg+xml",
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("repair-center-branding")
      .getPublicUrl("fixbudi-logo.svg");

    console.log("Logo uploaded successfully:", urlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Logo uploaded successfully",
        url: urlData.publicUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error uploading logo:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
