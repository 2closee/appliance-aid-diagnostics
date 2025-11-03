import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmationRequest {
  repair_job_id: string;
  confirmation_type: 'device_returned' | 'repair_satisfaction';
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { repair_job_id, confirmation_type, satisfaction_rating, satisfaction_feedback }: ConfirmationRequest = await req.json();

    console.log('Processing confirmation:', { repair_job_id, confirmation_type, user_id: user.id });

    // Fetch the repair job
    const { data: job, error: jobError } = await supabaseClient
      .from('repair_jobs')
      .select('*, "Repair Center":repair_center_id(id, name, email)')
      .eq('id', repair_job_id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(
        JSON.stringify({ error: 'Repair job not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate job status
    if (job.job_status !== 'returned') {
      return new Response(
        JSON.stringify({ error: 'Job must be in "returned" status for confirmation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updateData: any = {};
    let notificationData: any = {
      job_id: repair_job_id,
      appliance_type: job.appliance_type,
      customer_name: job.customer_name,
    };

    // Handle device return confirmation
    if (confirmation_type === 'device_returned') {
      if (job.device_returned_confirmed) {
        return new Response(
          JSON.stringify({ error: 'Device return already confirmed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      updateData = {
        device_returned_confirmed: true,
        device_returned_confirmed_at: new Date().toISOString(),
      };

      notificationData.confirmation_type = 'device_returned';
      console.log('Confirming device return');
    }

    // Handle satisfaction confirmation
    if (confirmation_type === 'repair_satisfaction') {
      if (!job.device_returned_confirmed) {
        return new Response(
          JSON.stringify({ error: 'Device return must be confirmed first' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (job.repair_satisfaction_confirmed) {
        return new Response(
          JSON.stringify({ error: 'Satisfaction already confirmed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!satisfaction_rating || satisfaction_rating < 1 || satisfaction_rating > 5) {
        return new Response(
          JSON.stringify({ error: 'Valid satisfaction rating (1-5) is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      updateData = {
        repair_satisfaction_confirmed: true,
        repair_satisfaction_confirmed_at: new Date().toISOString(),
        satisfaction_rating,
        satisfaction_feedback: satisfaction_feedback || null,
      };

      notificationData.confirmation_type = 'satisfaction_confirmed';
      notificationData.rating = satisfaction_rating;
      notificationData.feedback = satisfaction_feedback;
      console.log('Confirming satisfaction:', { rating: satisfaction_rating });
    }

    // Check if both confirmations will be complete after this update
    const bothConfirmed = confirmation_type === 'repair_satisfaction' || 
      (confirmation_type === 'device_returned' && job.repair_satisfaction_confirmed);

    if (bothConfirmed || (confirmation_type === 'repair_satisfaction' && job.device_returned_confirmed)) {
      updateData.customer_confirmed = true;
      updateData.job_status = 'completed';
      updateData.completion_date = new Date().toISOString();
      console.log('Both confirmations complete - marking job as completed');
    }

    // Update repair job
    const { error: updateError } = await supabaseClient
      .from('repair_jobs')
      .update(updateData)
      .eq('id', repair_job_id);

    if (updateError) {
      console.error('Error updating job:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update repair job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications to admin and repair center
    try {
      // Get admin users
      const { data: admins } = await supabaseClient
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      // Get repair center staff
      const { data: staff } = await supabaseClient
        .from('repair_center_staff')
        .select('user_id')
        .eq('repair_center_id', job.repair_center_id)
        .eq('is_active', true);

      // Log notifications
      const notifications = [];

      if (admins) {
        for (const admin of admins) {
          notifications.push({
            repair_job_id,
            notification_type: confirmation_type,
            sent_to: 'admin',
            recipient_id: admin.user_id,
            notification_data: notificationData,
          });
        }
      }

      if (staff) {
        for (const staffMember of staff) {
          notifications.push({
            repair_job_id,
            notification_type: confirmation_type,
            sent_to: 'repair_center',
            recipient_id: staffMember.user_id,
            notification_data: notificationData,
          });
        }
      }

      if (notifications.length > 0) {
        await supabaseClient
          .from('completion_feedback_notifications')
          .insert(notifications);
      }

      // Send email notifications
      await supabaseClient.functions.invoke('send-job-notification', {
        body: {
          email_type: confirmation_type === 'device_returned' ? 'device_return_confirmed' : 'satisfaction_feedback_received',
          repair_job_id,
          job_data: {
            ...job,
            satisfaction_rating,
            satisfaction_feedback,
          },
        },
      });

    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${confirmation_type === 'device_returned' ? 'Device return' : 'Satisfaction'} confirmed successfully`,
        job_completed: updateData.job_status === 'completed',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in confirm-job-completion:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
