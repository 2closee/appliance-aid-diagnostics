import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-JOB-NOTIFICATION] ${step}${detailsStr}`);
};

const emailTemplates = {
  job_created: (data: any) => ({
    subject: `Repair Request Confirmed - Job #${data.job_id.slice(0, 8)}`,
    html: `
      <h2>Your repair request has been received!</h2>
      <p>Hello ${data.customer_name},</p>
      <p>We've received your repair request for your ${data.appliance_type}.</p>
      <p><strong>Job ID:</strong> ${data.job_id}</p>
      <p><strong>Status:</strong> Request Submitted</p>
      <p>A repair center will review your request shortly and schedule a pickup.</p>
      <p>Track your repair: <a href="${data.app_url}/repair-jobs/${data.job_id}">View Job Details</a></p>
      <br>
      <p>Best regards,<br>Fixbudi Team</p>
    `
  }),
  
  pickup_scheduled: (data: any) => ({
    subject: `Pickup Scheduled - Job #${data.job_id.slice(0, 8)}`,
    html: `
      <h2>Your pickup has been scheduled</h2>
      <p>Hello ${data.customer_name},</p>
      <p>Good news! Your ${data.appliance_type} pickup has been scheduled.</p>
      <p><strong>Pickup Date:</strong> ${data.pickup_date}</p>
      <p><strong>Address:</strong> ${data.pickup_address}</p>
      <p>Please ensure the appliance is ready for collection.</p>
      <p>Track your repair: <a href="${data.app_url}/repair-jobs/${data.job_id}">View Job Details</a></p>
      <br>
      <p>Best regards,<br>Fixbudi Team</p>
    `
  }),
  
  item_picked_up: (data: any) => ({
    subject: `Item Collected - Job #${data.job_id.slice(0, 8)}`,
    html: `
      <h2>Your appliance has been collected</h2>
      <p>Hello ${data.customer_name},</p>
      <p>Your ${data.appliance_type} has been successfully picked up and is on its way to the repair center.</p>
      <p>We'll keep you updated on the repair progress.</p>
      <p>Track your repair: <a href="${data.app_url}/repair-jobs/${data.job_id}">View Job Details</a></p>
      <br>
      <p>Best regards,<br>Fixbudi Team</p>
    `
  }),
  
  repair_started: (data: any) => ({
    subject: `Repair Started - Job #${data.job_id.slice(0, 8)}`,
    html: `
      <h2>Repair work has begun</h2>
      <p>Hello ${data.customer_name},</p>
      <p>Great news! The repair center has started working on your ${data.appliance_type}.</p>
      ${data.estimated_completion ? `<p><strong>Estimated Completion:</strong> ${data.estimated_completion}</p>` : ''}
      <p>We'll notify you when the repair is complete.</p>
      <p>Track your repair: <a href="${data.app_url}/repair-jobs/${data.job_id}">View Job Details</a></p>
      <br>
      <p>Best regards,<br>Fixbudi Team</p>
    `
  }),
  
  repair_completed: (data: any) => ({
    subject: `Repair Complete - Payment Required - Job #${data.job_id.slice(0, 8)}`,
    html: `
      <h2>Your repair is complete!</h2>
      <p>Hello ${data.customer_name},</p>
      <p>Excellent news! Your ${data.appliance_type} has been successfully repaired.</p>
      ${data.final_cost ? `<p><strong>Final Cost:</strong> $${data.final_cost}</p>` : ''}
      <p>Please complete payment to finalize your repair and arrange for return.</p>
      <p><a href="${data.app_url}/repair-jobs/${data.job_id}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Make Payment</a></p>
      <br>
      <p>Best regards,<br>Fixbudi Team</p>
    `
  }),
  
  payment_received: (data: any) => ({
    subject: `Payment Confirmed - Job #${data.job_id.slice(0, 8)}`,
    html: `
      <h2>Payment received successfully</h2>
      <p>Hello ${data.customer_name},</p>
      <p>Thank you! Your payment has been processed.</p>
      ${data.final_cost ? `<p><strong>Amount Paid:</strong> $${data.final_cost}</p>` : ''}
      <p><strong>Transaction ID:</strong> ${data.payment_intent_id || 'Processing'}</p>
      <p>Your ${data.appliance_type} is ready for return. The repair center will contact you shortly to arrange delivery.</p>
      <p>View your invoice: <a href="${data.app_url}/repair-jobs/${data.job_id}">Download Invoice</a></p>
      <br>
      <p>Best regards,<br>Fixbudi Team</p>
    `
  }),
  
  item_returned: (data: any) => ({
    subject: `Repair Complete - Item Returned - Job #${data.job_id.slice(0, 8)}`,
    html: `
      <h2>Your appliance has been returned</h2>
      <p>Hello ${data.customer_name},</p>
      <p>Your ${data.appliance_type} has been successfully returned.</p>
      <p>Thank you for choosing Fixbudi!</p>
      <p>We'd love to hear about your experience. Please leave a review:</p>
      <p><a href="${data.app_url}/repair-jobs/${data.job_id}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Leave a Review</a></p>
      <br>
      <p>Best regards,<br>Fixbudi Team</p>
    `
  })
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
    const { 
      email_type, 
      repair_job_id, 
      customer_email, 
      customer_name,
      ...additionalData 
    } = await req.json();

    logStep("Sending notification", { email_type, repair_job_id, customer_email });

    if (!customer_email || !email_type) {
      throw new Error("Missing required fields");
    }

    const app_url = Deno.env.get("APP_URL") || "https://fixbudi.lovable.app";

    const templateData = {
      customer_name: customer_name || "Customer",
      job_id: repair_job_id,
      app_url,
      ...additionalData
    };

    const template = emailTemplates[email_type as keyof typeof emailTemplates];
    if (!template) {
      throw new Error(`Unknown email type: ${email_type}`);
    }

    const { subject, html } = template(templateData);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Fixbudi <noreply@updates.lovable.app>",
        to: [customer_email],
        subject,
        html,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resData)}`);
    }

    // Track email in database
    if (repair_job_id) {
      await supabaseClient.from("email_notifications").insert({
        repair_job_id,
        email_type,
        recipient_email: customer_email,
        status: "sent",
        metadata: { resend_id: resData.id }
      });
    }

    logStep("Email sent successfully", { email_id: resData.id });

    return new Response(JSON.stringify({ success: true, email_id: resData.id }), {
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
