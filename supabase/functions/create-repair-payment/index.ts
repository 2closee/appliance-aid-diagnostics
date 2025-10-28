import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-REPAIR-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { repair_job_id, amount } = await req.json();
    if (!repair_job_id || !amount) {
      throw new Error("Missing required fields: repair_job_id and amount");
    }
    logStep("Request data", { repair_job_id, amount });

    // Verify the repair job belongs to the authenticated user
    const { data: repairJob, error: jobError } = await supabaseClient
      .from("repair_jobs")
      .select("*")
      .eq("id", repair_job_id)
      .eq("user_id", user.id)
      .single();

    if (jobError || !repairJob) {
      throw new Error("Repair job not found or access denied");
    }
    logStep("Repair job verified", { jobId: repairJob.id, status: repairJob.job_status });

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100), // Convert to kobo (smallest unit for NGN)
        currency: "NGN",
        reference: `repair_${repair_job_id}_${Date.now()}`,
        callback_url: `${req.headers.get("origin")}/repair-jobs/${repair_job_id}?payment=success`,
        metadata: {
          repair_job_id: repair_job_id,
          user_id: user.id,
          payment_type: "repair_service",
          customer_name: repairJob.customer_name,
          appliance_type: repairJob.appliance_type
        }
      })
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      logStep("Paystack initialization failed", { error: errorData });
      throw new Error(`Paystack error: ${errorData.message || "Unknown error"}`);
    }

    const paystackData = await paystackResponse.json();
    logStep("Paystack transaction initialized", { 
      reference: paystackData.data.reference, 
      url: paystackData.data.authorization_url 
    });

    // Create payment record
    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        repair_job_id: repair_job_id,
        payment_reference: paystackData.data.reference,
        amount: amount,
        currency: "NGN",
        payment_type: "repair_service",
        payment_status: "pending",
        commission_rate: 0.075,
        payment_provider: "paystack"
      });

    if (paymentError) {
      logStep("Payment record creation failed", { error: paymentError });
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }
    logStep("Payment record created");

    return new Response(JSON.stringify({ 
      url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      access_code: paystackData.data.access_code
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