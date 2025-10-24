import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYSTACK-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("x-paystack-signature");
  
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
    const hash = createHmac("sha512", paystackSecretKey)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      logStep("ERROR", { message: "Invalid signature" });
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(body);
    logStep("Webhook received", { type: event.event, reference: event.data?.reference });

    switch (event.event) {
      case "charge.success": {
        const transaction = event.data;
        logStep("Payment successful", { reference: transaction.reference });

        // Get repair job ID from metadata
        const repairJobId = transaction.metadata?.repair_job_id;
        if (!repairJobId) {
          throw new Error("No repair_job_id in metadata");
        }

        // Update payment record
        const { error: paymentError } = await supabaseClient
          .from("payments")
          .update({
            payment_status: "completed",
            payment_date: new Date().toISOString(),
            payment_transaction_id: transaction.id.toString(),
            webhook_received_at: new Date().toISOString()
          })
          .eq("payment_reference", transaction.reference);

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

      case "charge.failed": {
        const transaction = event.data;
        logStep("Payment failed", { reference: transaction.reference });

        await supabaseClient
          .from("payments")
          .update({
            payment_status: "failed",
            webhook_received_at: new Date().toISOString()
          })
          .eq("payment_reference", transaction.reference);

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.event });
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
