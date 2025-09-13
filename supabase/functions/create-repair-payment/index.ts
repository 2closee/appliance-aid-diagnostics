import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found");
    }

    // Create payment session for repair service
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Repair Service - ${repairJob.appliance_type}`,
              description: `Professional repair for ${repairJob.appliance_brand} ${repairJob.appliance_model}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/repair-jobs/${repair_job_id}?payment=success`,
      cancel_url: `${req.headers.get("origin")}/repair-jobs/${repair_job_id}?payment=cancelled`,
      metadata: {
        repair_job_id: repair_job_id,
        user_id: user.id,
        payment_type: "repair_service"
      }
    });
    logStep("Stripe session created", { sessionId: session.id, url: session.url });

    // Create payment record
    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        repair_job_id: repair_job_id,
        stripe_checkout_session_id: session.id,
        amount: amount,
        currency: "usd",
        payment_type: "repair_service",
        payment_status: "pending",
        commission_rate: 0.05
      });

    if (paymentError) {
      logStep("Payment record creation failed", { error: paymentError });
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }
    logStep("Payment record created");

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
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