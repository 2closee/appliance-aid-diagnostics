import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESPOND-QUOTE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }
    logStep("User authenticated", { userId: user.id });

    const { repair_job_id, response, customer_notes } = await req.json();
    logStep("Request parsed", { repair_job_id, response });

    // Verify user owns this job
    const { data: job, error: jobError } = await supabase
      .from('repair_jobs')
      .select('user_id, repair_center_id, customer_email, customer_name, appliance_type')
      .eq('id', repair_job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    if (job.user_id !== user.id) {
      throw new Error('Forbidden: Not your job');
    }
    logStep("Job ownership verified");

    // Update job status based on response
    let newStatus: string;
    let notificationType: string;
    let updateData: any = {};

    switch (response) {
      case 'accept':
        newStatus = 'requested'; // Auto-progress to workflow start
        notificationType = 'quote_accepted';
        updateData.quote_accepted_at = new Date().toISOString(); // Track acceptance time
        break;
      case 'reject':
        newStatus = 'quote_rejected';
        notificationType = 'quote_rejected';
        break;
      case 'negotiate':
        newStatus = 'quote_negotiating';
        notificationType = 'quote_negotiating';
        break;
      default:
        throw new Error('Invalid response type');
    }

    const { error: updateError } = await supabase
      .from('repair_jobs')
      .update({
        job_status: newStatus,
        notes: customer_notes ? `Customer response: ${customer_notes}` : null,
        ...updateData
      })
      .eq('id', repair_job_id);

    if (updateError) throw updateError;
    logStep("Job status updated", { newStatus });

    // If negotiating, create or ensure conversation exists
    if (response === 'negotiate') {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('repair_job_id', repair_job_id)
        .maybeSingle();

      if (!existingConv) {
        await supabase
          .from('conversations')
          .insert({
            repair_job_id,
            customer_id: user.id,
            repair_center_id: job.repair_center_id,
            status: 'active'
          });
        logStep("Conversation created for negotiation");
      }
    }

    // Send email notification to repair center
    try {
      await supabase.functions.invoke('send-job-notification', {
        body: {
          repair_job_id,
          notification_type: notificationType,
          repair_center_id: job.repair_center_id,
          customer_notes,
          customer_name: job.customer_name,
          appliance_type: job.appliance_type
        }
      });
      logStep("Email notification sent to repair center");
    } catch (emailError) {
      console.error('Email error (non-fatal):', emailError);
    }

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === 'Unauthorized' || error.message.includes('Forbidden') ? 403 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
