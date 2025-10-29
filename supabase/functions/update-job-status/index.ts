import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-JOB-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { repair_job_id, status, notes, final_cost } = await req.json();
    if (!repair_job_id || !status) {
      throw new Error("Missing required fields: repair_job_id and status");
    }
    logStep("Request data", { repair_job_id, status, notes, final_cost });

    // Define sequential workflow validation
    const statusWorkflow: Record<string, string[]> = {
      'requested': ['pickup_scheduled', 'cancelled'],
      'pickup_scheduled': ['picked_up', 'cancelled'],
      'picked_up': ['in_repair', 'cancelled'],
      'in_repair': ['repair_completed', 'cancelled'],
      'repair_completed': ['returned', 'cancelled'],
      'returned': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    // Verify access to the repair job (user owns it or is admin)
    const { data: repairJob, error: jobError } = await supabaseClient
      .from("repair_jobs")
      .select("*")
      .eq("id", repair_job_id)
      .single();

    if (jobError || !repairJob) {
      throw new Error("Repair job not found");
    }

    // Check if user has permission to update this job
    const canUpdate = repairJob.user_id === user.id;
    // TODO: Add admin role check here using has_role function
    
    if (!canUpdate) {
      throw new Error("Access denied");
    }
    logStep("Access verified");

    // Validate workflow progression (skip validation for cancelled)
    const currentStatus = repairJob.job_status;
    const validNextStatuses = statusWorkflow[currentStatus] || [];
    
    if (status !== 'cancelled' && !validNextStatuses.includes(status)) {
      logStep("Invalid status transition", { currentStatus, requestedStatus: status, validNextStatuses });
      throw new Error(`Invalid status transition. Current: ${currentStatus}. Valid next statuses: ${validNextStatuses.join(', ')}`);
    }
    logStep("Workflow validation passed");

    // PAYMENT ENFORCEMENT: Prevent status change to 'returned' without payment
    if (status === 'returned') {
      logStep("Checking payment status for return");
      
      const { data: payment, error: paymentError } = await supabaseClient
        .from("payments")
        .select("payment_status")
        .eq("repair_job_id", repair_job_id)
        .eq("payment_type", "final_payment")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (paymentError) {
        logStep("Payment check error", { error: paymentError });
        throw new Error("Failed to verify payment status");
      }
      
      if (!payment || payment.payment_status !== 'completed') {
        logStep("Payment not completed", { payment });
        throw new Error("Payment must be completed before item can be returned. Customer needs to pay first.");
      }
      
      logStep("Payment verified", { payment_status: payment.payment_status });
    }

    // Prepare update data
    const updateData: any = {
      job_status: status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (final_cost !== undefined) {
      updateData.final_cost = final_cost;
    }

    if (status === 'completed') {
      updateData.completion_date = new Date().toISOString();
    }

    // Update the repair job
    const { error: updateError } = await supabaseClient
      .from("repair_jobs")
      .update(updateData)
      .eq("id", repair_job_id);

    if (updateError) {
      logStep("Job update failed", { error: updateError });
      throw new Error(`Failed to update job: ${updateError.message}`);
    }
    logStep("Job updated successfully");

    // Send notification email when repair is completed
    if (status === 'repair_completed') {
      logStep("Sending repair completion notification");
      try {
        const { error: notifError } = await supabaseClient.functions.invoke('send-job-notification', {
          body: {
            email_type: 'repair_completed',
            repair_job_id: repair_job_id,
            customer_email: repairJob.customer_email,
            customer_name: repairJob.customer_name,
            appliance_type: repairJob.appliance_type,
            final_cost: updateData.final_cost || repairJob.final_cost,
          }
        });
        
        if (notifError) {
          logStep("Notification send failed", { error: notifError });
          // Don't fail the status update if email fails
        } else {
          logStep("Notification sent successfully");
        }
      } catch (notifError) {
        logStep("Notification error", { error: notifError });
        // Don't fail the status update if email fails
      }
    }

    // Add status history entry (this will be handled by the trigger automatically)
    
    return new Response(JSON.stringify({ 
      success: true,
      message: "Job status updated successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});