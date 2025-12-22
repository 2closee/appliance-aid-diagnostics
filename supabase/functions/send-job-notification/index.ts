import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { 
  wrapEmailTemplate, 
  createButton, 
  createBox, 
  createDetailsTable,
  createBadge,
  EMAIL_STYLES,
  BRAND_COLORS 
} from "../_shared/email-template.ts";

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
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Your Repair Request Has Been Received!</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.customer_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">We've received your repair request for your <strong>${data.appliance_type}</strong>.</p>
      
      ${createBox(`
        ${createDetailsTable([
          { label: 'Job ID', value: data.job_id },
          { label: 'Status', value: createBadge('Request Submitted', 'pending') },
        ])}
      `, 'info')}
      
      <p style="${EMAIL_STYLES.paragraph}">A repair center will review your request shortly and schedule a pickup.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        ${createButton('View Job Details', `${data.app_url}/repair-jobs/${data.job_id}`)}
      </div>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),
  
  pickup_scheduled: (data: any) => ({
    subject: `Pickup Scheduled - Job #${data.job_id.slice(0, 8)}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Your Pickup Has Been Scheduled</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.customer_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">Good news! Your <strong>${data.appliance_type}</strong> pickup has been scheduled.</p>
      
      ${createBox(`
        ${createDetailsTable([
          { label: 'Pickup Date', value: `<strong>${data.pickup_date}</strong>` },
          { label: 'Address', value: data.pickup_address },
        ])}
      `, 'success')}
      
      <p style="${EMAIL_STYLES.paragraph}">Please ensure the appliance is ready for collection at the scheduled time.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        ${createButton('View Job Details', `${data.app_url}/repair-jobs/${data.job_id}`)}
      </div>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),
  
  item_picked_up: (data: any) => ({
    subject: `Item Collected - Job #${data.job_id.slice(0, 8)}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Your Appliance Has Been Collected</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.customer_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">Your <strong>${data.appliance_type}</strong> has been successfully picked up and is on its way to the repair center.</p>
      
      ${createBox(`
        <p style="margin: 0; color: ${BRAND_COLORS.text};">We'll keep you updated on the repair progress. You'll receive a notification when the repair begins.</p>
      `, 'highlight')}
      
      <div style="text-align: center; margin: 30px 0;">
        ${createButton('Track Your Repair', `${data.app_url}/repair-jobs/${data.job_id}`)}
      </div>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),
  
  repair_started: (data: any) => ({
    subject: `Repair Started - Job #${data.job_id.slice(0, 8)}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Repair Work Has Begun</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.customer_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">Great news! The repair center has started working on your <strong>${data.appliance_type}</strong>.</p>
      
      ${data.estimated_completion ? createBox(`
        ${createDetailsTable([
          { label: 'Estimated Completion', value: `<strong>${data.estimated_completion}</strong>` },
        ])}
      `, 'info') : ''}
      
      <p style="${EMAIL_STYLES.paragraph}">We'll notify you as soon as the repair is complete.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        ${createButton('Track Your Repair', `${data.app_url}/repair-jobs/${data.job_id}`)}
      </div>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),
  
  repair_completed: (data: any) => ({
    subject: `Repair Complete - Payment Required - Job #${data.job_id.slice(0, 8)}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">🎉 Your Repair Is Complete!</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.customer_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">Excellent news! Your <strong>${data.appliance_type}</strong> has been successfully repaired.</p>
      
      ${data.final_cost ? createBox(`
        ${createDetailsTable([
          { label: 'Final Cost', value: `<strong style="font-size: 18px;">₦${Number(data.final_cost).toLocaleString()}</strong>` },
        ])}
      `, 'success') : ''}
      
      <p style="${EMAIL_STYLES.paragraph}">Please complete payment to finalize your repair and arrange for return.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        ${createButton('Make Payment', `${data.app_url}/repair-jobs/${data.job_id}`)}
      </div>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),
  
  payment_received: (data: any) => ({
    subject: `Payment Confirmed - Job #${data.job_id.slice(0, 8)}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">✅ Payment Received Successfully</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.customer_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">Thank you! Your payment has been processed successfully.</p>
      
      ${createBox(`
        ${createDetailsTable([
          { label: 'Amount Paid', value: data.final_cost ? `<strong>₦${Number(data.final_cost).toLocaleString()}</strong>` : 'Processing' },
          { label: 'Transaction ID', value: data.payment_intent_id || 'Processing' },
        ])}
      `, 'success')}
      
      <p style="${EMAIL_STYLES.paragraph}">Your <strong>${data.appliance_type}</strong> is ready for return. The repair center will contact you shortly to arrange delivery.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        ${createButton('Download Invoice', `${data.app_url}/repair-jobs/${data.job_id}`)}
      </div>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),
  
  item_returned: (data: any) => ({
    subject: `Repair Complete - Item Returned - Job #${data.job_id.slice(0, 8)}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Your Appliance Has Been Returned</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.customer_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">Your <strong>${data.appliance_type}</strong> has been successfully returned.</p>
      
      ${createBox(`
        <p style="margin: 0; color: #166534;"><strong>Thank you for choosing FixBudi!</strong></p>
        <p style="margin: 8px 0 0 0; color: ${BRAND_COLORS.text};">We hope you're satisfied with the repair service.</p>
      `, 'success')}
      
      <p style="${EMAIL_STYLES.paragraph}">We'd love to hear about your experience. Please take a moment to leave a review:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        ${createButton('Leave a Review', `${data.app_url}/repair-jobs/${data.job_id}`)}
      </div>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),

  payout_processed: (data: any) => ({
    subject: `Payout Processed - ${data.payout_reference}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">💰 Payout Successfully Processed</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.repair_center_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">Great news! Your payout has been processed successfully.</p>
      
      ${createBox(`
        ${createDetailsTable([
          { label: 'Payout Amount', value: `<strong style="font-size: 18px; color: ${BRAND_COLORS.success};">₦${Number(data.payout_amount).toLocaleString()}</strong>` },
          { label: 'Reference', value: data.payout_reference },
          { label: 'Date', value: new Date(data.payout_date).toLocaleDateString() },
        ])}
      `, 'success')}
      
      <hr style="${EMAIL_STYLES.divider}">
      
      <h3 style="${EMAIL_STYLES.h3}">Bank Account Details</h3>
      ${createDetailsTable([
        { label: 'Bank Name', value: data.bank_name },
        { label: 'Account Number', value: data.account_number },
        { label: 'Account Name', value: data.account_name },
      ])}
      
      ${createBox(`
        <p style="margin: 0; color: ${BRAND_COLORS.text};">Please allow 2-3 business days for the funds to reflect in your account.</p>
      `, 'info')}
      
      <p style="${EMAIL_STYLES.paragraph}">If you have any questions about this payout, please contact our support team.</p>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),

  bank_account_whitelisted: (data: any) => ({
    subject: `Bank Account Whitelisted - ${data.repair_center_name}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">✅ Bank Account Successfully Whitelisted</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello ${data.repair_center_name},</p>
      <p style="${EMAIL_STYLES.paragraph}">Your bank account has been successfully added and whitelisted for receiving payouts.</p>
      
      <h3 style="${EMAIL_STYLES.h3}">Account Details</h3>
      ${createDetailsTable([
        { label: 'Bank Name', value: data.bank_name },
        { label: 'Account Number', value: data.account_number },
        { label: 'Account Name', value: data.account_name },
      ])}
      
      ${createBox(`
        <p style="margin: 0;"><strong>⚠️ Important:</strong> This account can only be changed after 2 weeks from today for security purposes.</p>
      `, 'warning')}
      
      <p style="${EMAIL_STYLES.paragraph}">You can now receive payouts to this account. All future payouts will be processed weekly.</p>
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),

  device_return_confirmed: (data: any) => ({
    subject: `Device Returned - Job #${data.job_id.slice(0, 8)}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Customer Confirmed Device Return</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello,</p>
      <p style="${EMAIL_STYLES.paragraph}">The customer has confirmed receiving their device back for the following repair job:</p>
      
      ${createDetailsTable([
        { label: 'Job ID', value: data.job_id },
        { label: 'Customer', value: data.customer_name },
        { label: 'Appliance', value: data.appliance_type },
      ])}
      
      ${createBox(`
        <p style="margin: 0; color: ${BRAND_COLORS.text};">The customer is now being asked to rate their satisfaction with the repair.</p>
      `, 'highlight')}
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
  }),

  satisfaction_feedback_received: (data: any) => ({
    subject: `Customer Feedback Received - Job #${data.job_id.slice(0, 8)}`,
    html: wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Customer Satisfaction Feedback</h2>
      <p style="${EMAIL_STYLES.paragraph}">Hello,</p>
      <p style="${EMAIL_STYLES.paragraph}">The customer has completed their satisfaction feedback for the following repair job:</p>
      
      ${createDetailsTable([
        { label: 'Job ID', value: data.job_id },
        { label: 'Customer', value: data.customer_name },
        { label: 'Appliance', value: data.appliance_type },
      ])}
      
      <hr style="${EMAIL_STYLES.divider}">
      
      <h3 style="${EMAIL_STYLES.h3}">Customer Rating</h3>
      <p style="font-size: 28px; color: ${BRAND_COLORS.warning}; margin: 10px 0;">
        ${'★'.repeat(data.job_data?.satisfaction_rating || 0)}${'☆'.repeat(5 - (data.job_data?.satisfaction_rating || 0))}
      </p>
      <p style="${EMAIL_STYLES.paragraph}"><strong>${data.job_data?.satisfaction_rating || 0} out of 5 stars</strong></p>
      
      ${data.job_data?.satisfaction_feedback ? `
        <h3 style="${EMAIL_STYLES.h3}">Customer Comments</h3>
        ${createBox(`
          <p style="margin: 0; font-style: italic; color: ${BRAND_COLORS.text};">"${data.job_data.satisfaction_feedback}"</p>
        `, 'info')}
      ` : ''}
      
      ${createBox(`
        <p style="margin: 0; color: #166534;"><strong>✅ This repair job is now complete!</strong></p>
      `, 'success')}
      
      <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
    `)
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
      repair_center_email,
      customer_name,
      repair_center_name,
      ...additionalData 
    } = await req.json();

    const recipient_email = repair_center_email || customer_email;

    logStep("Sending notification", { email_type, repair_job_id, recipient_email });

    if (!recipient_email || !email_type) {
      throw new Error("Missing required fields");
    }

    const app_url = Deno.env.get("APP_URL") || "https://fixbudi.lovable.app";

    const templateData = {
      customer_name: customer_name || "Customer",
      repair_center_name: repair_center_name || "Repair Center",
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
        from: "FixBudi <noreply@fixbudi.com>",
        to: [recipient_email],
        subject,
        html,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resData)}`);
    }

    // Track email in database (only for job-related emails)
    if (repair_job_id) {
      await supabaseClient.from("email_notifications").insert({
        repair_job_id,
        email_type,
        recipient_email,
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
