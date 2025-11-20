import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WHATSAPP-NOTIFICATION] ${step}${detailsStr}`);
};

const messageTemplates = {
  quote_accepted: (data: any) => ({
    message: `✅ Quote Accepted!\n\nJob #${data.job_id?.slice(0, 8)}\nCustomer: ${data.customer_name}\nAppliance: ${data.appliance_type}\n\nPickup delivery has been automatically scheduled. Check your dashboard for details.`,
  }),
  
  quote_rejected: (data: any) => ({
    message: `❌ Quote Rejected\n\nJob #${data.job_id?.slice(0, 8)}\nCustomer: ${data.customer_name}\nAppliance: ${data.appliance_type}\n\n${data.customer_notes ? `Reason: ${data.customer_notes}` : ''}`,
  }),
  
  quote_negotiating: (data: any) => ({
    message: `💬 Customer Wants to Negotiate\n\nJob #${data.job_id?.slice(0, 8)}\nCustomer: ${data.customer_name}\nAppliance: ${data.appliance_type}\n\n${data.customer_notes ? `Message: ${data.customer_notes}` : ''}\n\nPlease respond via chat.`,
  }),

  pickup_scheduled: (data: any) => ({
    message: `🚚 Pickup Scheduled!\n\nJob #${data.job_id?.slice(0, 8)}\nAppliance: ${data.appliance_type}\nAddress: ${data.pickup_address}\n\nYour pickup delivery will arrive soon. Please have your device ready.`,
  }),

  repair_completed: (data: any) => ({
    message: `✅ Repair Complete!\n\nJob #${data.job_id?.slice(0, 8)}\nAppliance: ${data.appliance_type}\n${data.final_cost ? `Final Cost: ₦${data.final_cost}` : ''}\n\nPlease complete payment to arrange return delivery.`,
  }),

  delivery_created: (data: any) => ({
    message: `🚚 Delivery Scheduled\n\nType: ${data.delivery_type === 'pickup' ? 'Pickup' : 'Return'}\nEstimated Cost: ₦${data.estimated_cost}\n\n💵 Payment: Cash to rider\n📍 Delivery commission (5%): ₦${data.app_commission}\n\nThe rider will contact you shortly.`,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    if (!N8N_WEBHOOK_URL) {
      throw new Error("N8N_WEBHOOK_URL not configured");
    }

    const {
      phone_number,
      notification_type,
      data: notificationData
    } = await req.json();

    if (!phone_number || !notification_type) {
      throw new Error("Missing required fields: phone_number, notification_type");
    }

    logStep("Request data", { phone_number, notification_type });

    // Get message template
    const template = messageTemplates[notification_type as keyof typeof messageTemplates];
    if (!template) {
      throw new Error(`Unknown notification type: ${notification_type}`);
    }

    const { message } = template(notificationData);
    logStep("Message generated", { message });

    // Send to N8N webhook for WhatsApp/SMS processing
    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number,
        message,
        notification_type,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      logStep("Webhook failed", { status: webhookResponse.status, error: errorText });
      throw new Error(`Webhook failed: ${webhookResponse.status}`);
    }

    const webhookResult = await webhookResponse.json();
    logStep("Notification sent successfully", { result: webhookResult });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        notification_type,
        phone_number,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("Error", { error: error.message });
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
