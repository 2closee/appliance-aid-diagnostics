import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("Missing session_id");
    }
    logStep("Request data", { session_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Stripe session retrieved", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      status: session.status 
    });

    // Find the payment record in our database
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("stripe_checkout_session_id", session_id)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment record not found");
    }
    logStep("Payment record found", { paymentId: payment.id, status: payment.payment_status });

    // Verify the repair job belongs to the authenticated user
    const { data: repairJob, error: jobError } = await supabaseClient
      .from("repair_jobs")
      .select("*")
      .eq("id", payment.repair_job_id)
      .eq("user_id", user.id)
      .single();

    if (jobError || !repairJob) {
      throw new Error("Repair job not found or access denied");
    }
    logStep("Repair job verified", { jobId: repairJob.id, status: repairJob.job_status });

    let paymentStatus = payment.payment_status;
    let jobStatus = repairJob.job_status;

    // Update payment status if it has changed
    if (session.payment_status === "paid" && payment.payment_status === "pending") {
      const { error: updatePaymentError } = await supabaseClient
        .from("payments")
        .update({
          payment_status: "completed",
          payment_date: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string
        })
        .eq("id", payment.id);

      if (updatePaymentError) {
        logStep("Payment update failed", { error: updatePaymentError });
        throw new Error(`Failed to update payment: ${updatePaymentError.message}`);
      }

      paymentStatus = "completed";
      logStep("Payment status updated to completed");

      // Update job status to completed if payment is successful
      const { error: updateJobError } = await supabaseClient
        .from("repair_jobs")
        .update({ job_status: "completed" })
        .eq("id", payment.repair_job_id);

      if (updateJobError) {
        logStep("Job status update failed", { error: updateJobError });
      } else {
        jobStatus = "completed";
        logStep("Job status updated to completed");
      }
    } else if (session.status === "expired" && payment.payment_status === "pending") {
      const { error: updatePaymentError } = await supabaseClient
        .from("payments")
        .update({ payment_status: "failed" })
        .eq("id", payment.id);

      if (updatePaymentError) {
        logStep("Payment failure update failed", { error: updatePaymentError });
      } else {
        paymentStatus = "failed";
        logStep("Payment status updated to failed");
      }
    }

    return new Response(JSON.stringify({
      payment_status: paymentStatus,
      job_status: jobStatus,
      session_status: session.status,
      payment_intent_status: session.payment_status
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