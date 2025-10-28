import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROVIDE-QUOTE] ${step}${detailsStr}`);
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

    const { repair_job_id, quoted_cost, quote_notes } = await req.json();
    logStep("Request parsed", { repair_job_id, quoted_cost });

    // Verify user is staff at repair center for this job
    const { data: job, error: jobError } = await supabase
      .from('repair_jobs')
      .select('repair_center_id, customer_email, customer_name, appliance_type')
      .eq('id', repair_job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }
    logStep("Job found", { repair_center_id: job.repair_center_id });

    const { data: isStaff } = await supabase
      .rpc('is_staff_at_center', { _user_id: user.id, _center_id: job.repair_center_id });

    if (!isStaff) {
      throw new Error('Forbidden: Not authorized for this repair center');
    }
    logStep("Staff verified");

    // Update job with quote
    const { error: updateError } = await supabase
      .from('repair_jobs')
      .update({
        quoted_cost,
        quote_notes,
        quote_provided_at: new Date().toISOString(),
        job_status: 'quote_pending_review'
      })
      .eq('id', repair_job_id);

    if (updateError) throw updateError;
    logStep("Quote saved to database");

    // Send email notification to customer
    try {
      await supabase.functions.invoke('send-job-notification', {
        body: {
          repair_job_id,
          notification_type: 'quote_provided',
          quoted_cost,
          quote_notes,
          customer_email: job.customer_email,
          customer_name: job.customer_name,
          appliance_type: job.appliance_type
        }
      });
      logStep("Email notification sent");
    } catch (emailError) {
      console.error('Email error (non-fatal):', emailError);
    }

    return new Response(JSON.stringify({ success: true }), {
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
