import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYSTACK-WEBHOOK] ${step}${detailsStr}`);
};

// Verify webhook signature using Web Crypto API
async function verifySignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(paystackSecretKey);
  const messageData = encoder.encode(body);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hash === signature;
}

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
    const isValid = await verifySignature(body, signature);

    if (!isValid) {
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
        const { data: paymentData, error: paymentError } = await supabaseClient
          .from("payments")
          .update({
            payment_status: "completed",
            payment_date: new Date().toISOString(),
            payment_transaction_id: transaction.id.toString(),
            webhook_received_at: new Date().toISOString()
          })
          .eq("payment_reference", transaction.reference)
          .select("id")
          .single();

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

        // Get job details for email and payout
        const { data: job } = await supabaseClient
          .from("repair_jobs")
          .select("customer_email, customer_name, appliance_type, repair_center_id, final_cost")
          .eq("id", repairJobId)
          .single();

        // Create payout record for repair center
        if (job && paymentData) {
          const grossAmount = transaction.amount / 100; // Convert from kobo to naira
          const commissionRate = 0.075; // 7.5%
          const commissionAmount = Math.round(grossAmount * commissionRate * 100) / 100;
          const netAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;

          // Get settlement period (current week)
          const { data: settlementPeriod } = await supabaseClient
            .rpc("get_settlement_period", { date_input: new Date().toISOString() });

          const { error: payoutError } = await supabaseClient
            .from("repair_center_payouts")
            .insert({
              repair_center_id: job.repair_center_id,
              payment_id: paymentData.id,
              repair_job_id: repairJobId,
              gross_amount: grossAmount,
              commission_amount: commissionAmount,
              net_amount: netAmount,
              currency: transaction.currency || "NGN",
              settlement_period: settlementPeriod || null,
              payout_status: "pending"
            });

          if (payoutError) {
            logStep("Payout record creation failed", { error: payoutError });
            // Don't throw - payment already succeeded, this is just tracking
          } else {
            logStep("Payout record created", { netAmount, commissionAmount });
          }

          // Send payment confirmation email
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
