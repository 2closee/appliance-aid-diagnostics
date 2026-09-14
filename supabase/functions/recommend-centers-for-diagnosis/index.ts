import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rankCenters } from "../_shared/centerRanking.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const applianceType: string = (body.applianceType || '').toString().slice(0, 60);
    const diagnosis: string = (body.diagnosis || '').toString().slice(0, 3000);
    const area: string = (body.area || '').toString().slice(0, 120);
    const limit = Math.min(Math.max(Number(body.limit) || 3, 1), 6);
    const exclude: number[] = Array.isArray(body.exclude) ? body.exclude.map(Number) : [];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const centers = await rankCenters(supabase, {
      applianceType,
      diagnosis,
      area,
      limit,
      exclude,
      onlineOnly: body.onlineOnly === true,
    });

    return new Response(JSON.stringify({ centers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('recommend-centers-for-diagnosis error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to recommend centers' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
