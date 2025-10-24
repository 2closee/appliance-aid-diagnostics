import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { reference } = await req.json();
    if (!reference) {
      throw new Error("Missing payment reference");
    }
    logStep("Request data", { reference });

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
        }
      }
    );

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      throw new Error(`Paystack verification failed: ${errorData.message || "Unknown error"}`);
    }

    const paystackData = await paystackResponse.json();
    const transaction = paystackData.data;
    
    logStep("Paystack transaction retrieved", { 
      reference: transaction.reference, 
      status: transaction.status,
      amount: transaction.amount 
    });

    // Find the payment record in our database
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("payment_reference", reference)
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
    if (transaction.status === "success" && payment.payment_status === "pending") {
      const { error: updatePaymentError } = await supabaseClient
        .from("payments")
        .update({
          payment_status: "completed",
          payment_date: new Date().toISOString(),
          payment_transaction_id: transaction.id.toString()
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
    } else if (transaction.status === "failed" && payment.payment_status === "pending") {
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
      transaction_status: transaction.status,
      amount: transaction.amount / 100, // Convert from kobo to naira
      currency: transaction.currency
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