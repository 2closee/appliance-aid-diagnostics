import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handoffDiagnosticToCenter, type TranscriptMessage } from "../_shared/diagnosticHandoff.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (userError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const repairCenterId = Number(body.repairCenterId);
    if (!repairCenterId) throw new Error('repairCenterId is required');

    const appliance = (body.appliance || 'device').toString().slice(0, 100);
    const diagnosis = (body.diagnosis || '').toString().slice(0, 4000);
    const transcript: TranscriptMessage[] = Array.isArray(body.transcript) ? body.transcript.slice(-40) : [];
    const requestKey = (body.requestKey || crypto.randomUUID()).toString().slice(0, 80);

    const result = await handoffDiagnosticToCenter(supabase, {
      customerId: user.id,
      repairCenterId,
      appliance,
      diagnosis,
      report: body.report || null,
      transcript,
      diagnosticConversationId: body.diagnosticConversationId || null,
      attachments: body.attachments || null,
      requestKey,
      attemptNumber: 1,
    });

    return new Response(JSON.stringify({ ...result, requestKey }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('handoff-diagnostic-to-center error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Handoff failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
