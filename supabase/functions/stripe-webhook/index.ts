import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    logStep("ERROR", { message: "No signature found" });
    return new Response("No signature", { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Webhook received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id });

        const repairJobId = session.metadata?.repair_job_id;
        if (!repairJobId) {
          throw new Error("No repair_job_id in metadata");
        }

        // Update payment record
        const { error: paymentError } = await supabaseClient
          .from("payments")
          .update({
            payment_status: "completed",
            payment_date: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
            webhook_received_at: new Date().toISOString()
          })
          .eq("stripe_checkout_session_id", session.id);

        if (paymentError) {
          logStep("Payment update failed", { error: paymentError });
          throw paymentError;
        }

        // Update repair job status to completed
        const { error: jobError } = await supabaseClient
          .from("repair_jobs")
          .update({
            job_status: "completed",
            customer_confirmed: true,
            completion_date: new Date().toISOString()
          })
          .eq("id", repairJobId);

        if (jobError) {
          logStep("Job update failed", { error: jobError });
          throw jobError;
        }

        // Get job details for email
        const { data: job } = await supabaseClient
          .from("repair_jobs")
          .select("customer_email, customer_name, appliance_type")
          .eq("id", repairJobId)
          .single();

        // Send payment confirmation email
        if (job) {
          await supabaseClient.functions.invoke("send-job-notification", {
            body: {
              email_type: "payment_received",
              repair_job_id: repairJobId,
              customer_email: job.customer_email,
              customer_name: job.customer_name,
              appliance_type: job.appliance_type
            }
          });
        }

        logStep("Payment processed successfully", { repairJobId });
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout expired", { sessionId: session.id });

        await supabaseClient
          .from("payments")
          .update({
            payment_status: "failed",
            webhook_received_at: new Date().toISOString()
          })
          .eq("stripe_checkout_session_id", session.id);

        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("PaymentIntent succeeded", { id: paymentIntent.id });

        await supabaseClient
          .from("payments")
          .update({
            payment_status: "completed",
            payment_date: new Date().toISOString(),
            webhook_received_at: new Date().toISOString()
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("PaymentIntent failed", { id: paymentIntent.id });

        await supabaseClient
          .from("payments")
          .update({
            payment_status: "failed",
            webhook_received_at: new Date().toISOString()
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});
