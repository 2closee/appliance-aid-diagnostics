import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { 
  wrapEmailTemplate, 
  createButton, 
  createBox, 
  createDetailsTable,
  EMAIL_STYLES,
  BRAND_COLORS 
} from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  name: string;
  centerName?: string;
  type: "application" | "approval" | "rejection" | "custom" | "support";
  subject?: string;
  message?: string;
  centerId?: number;
  // Legacy support for old API
  to?: string;
  data?: {
    name: string;
    businessName: string;
  };
}

function getEmailContent(type: string, name: string, centerName?: string, customMessage?: string): { subject: string; html: string } {
  switch (type) {
    case "support":
      return {
        subject: "Support Request Received",
        html: wrapEmailTemplate(`
          <h2 style="${EMAIL_STYLES.h1}">Thank You for Contacting Us</h2>
          <p style="${EMAIL_STYLES.paragraph}">Dear ${name},</p>
          <p style="${EMAIL_STYLES.paragraph}">We have received your support request and our team will review it shortly.</p>
          
          ${createBox(`
            <h3 style="margin: 0 0 12px 0; color: ${BRAND_COLORS.primary};">Your Message:</h3>
            <p style="color: ${BRAND_COLORS.textLight}; white-space: pre-wrap; margin: 0;">${customMessage || 'No message provided'}</p>
          `, 'info')}
          
          <p style="${EMAIL_STYLES.paragraph}">We aim to respond to all inquiries within 24-48 hours. If your issue is urgent, please don't hesitate to reach out directly.</p>
          
          <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Support Team</strong></p>
        `)
      };

    case "custom":
      return {
        subject: "Message from FixBudi Admin",
        html: wrapEmailTemplate(`
          <h2 style="${EMAIL_STYLES.h1}">Message from FixBudi Admin</h2>
          <p style="${EMAIL_STYLES.paragraph}">Dear ${name},</p>
          
          ${createBox(`
            <p style="color: ${BRAND_COLORS.text}; margin: 0; line-height: 1.6;">${customMessage ? customMessage.replace(/\n/g, '<br>') : 'You have received a message from the FixBudi Admin team.'}</p>
          `, 'highlight')}
          
          <p style="${EMAIL_STYLES.paragraph}">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Admin Team</strong></p>
        `)
      };

    case "application":
      return {
        subject: "Repair Center Application Received",
        html: wrapEmailTemplate(`
          <h2 style="${EMAIL_STYLES.h1}">Application Received</h2>
          <p style="${EMAIL_STYLES.paragraph}">Dear ${name},</p>
          <p style="${EMAIL_STYLES.paragraph}">Thank you for applying to join our repair center network with <strong>${centerName}</strong>.</p>
          <p style="${EMAIL_STYLES.paragraph}">Your application has been received and is currently under review. Our team will carefully evaluate your submission and get back to you within 3-5 business days.</p>
          
          ${createBox(`
            <h3 style="margin: 0 0 12px 0; color: ${BRAND_COLORS.primary};">What happens next?</h3>
            <ul style="${EMAIL_STYLES.list}">
              <li style="${EMAIL_STYLES.listItem}">Our team will review your application and verify your credentials</li>
              <li style="${EMAIL_STYLES.listItem}">We may contact you for additional information if needed</li>
              <li style="${EMAIL_STYLES.listItem}">You'll receive an email notification once a decision is made</li>
              <li style="${EMAIL_STYLES.listItem}">If approved, you'll gain access to our repair center portal</li>
            </ul>
          `, 'info')}
          
          <p style="${EMAIL_STYLES.paragraph}">If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
        `)
      };

    case "approval":
      return {
        subject: "Repair Center Application Approved!",
        html: wrapEmailTemplate(`
          <h2 style="${EMAIL_STYLES.h1}">🎉 Application Approved!</h2>
          <p style="${EMAIL_STYLES.paragraph}">Dear ${name},</p>
          <p style="${EMAIL_STYLES.paragraph}">Congratulations! Your repair center application for <strong>${centerName}</strong> has been approved.</p>
          <p style="${EMAIL_STYLES.paragraph}">You can now access your repair center dashboard and start receiving repair requests from customers.</p>
          
          ${createBox(`
            <h3 style="margin: 0 0 12px 0; color: #166534;">Getting Started</h3>
            <ul style="margin: 0; padding-left: 20px; color: #166534;">
              <li style="${EMAIL_STYLES.listItem}">Log in to your repair center portal</li>
              <li style="${EMAIL_STYLES.listItem}">Complete your center profile with operating hours and specialties</li>
              <li style="${EMAIL_STYLES.listItem}">Start receiving and managing repair requests</li>
              <li style="${EMAIL_STYLES.listItem}">Track your earnings and performance</li>
            </ul>
          `, 'success')}
          
          <div style="text-align: center; margin: 30px 0;">
            ${createButton('Access Your Dashboard', 'https://fixbudi.com/repair-center-admin')}
          </div>
          
          <p style="${EMAIL_STYLES.paragraph}">Welcome to the FixBudi repair center network!</p>
          
          <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
        `)
      };

    case "rejection":
      return {
        subject: "Repair Center Application Update",
        html: wrapEmailTemplate(`
          <h2 style="${EMAIL_STYLES.h1}">Application Update</h2>
          <p style="${EMAIL_STYLES.paragraph}">Dear ${name},</p>
          <p style="${EMAIL_STYLES.paragraph}">Thank you for your interest in joining our repair center network with <strong>${centerName}</strong>.</p>
          <p style="${EMAIL_STYLES.paragraph}">After careful review, we are unable to approve your application at this time. This decision may be based on various factors including location coverage, capacity, or specific requirements not being met.</p>
          
          ${createBox(`
            <h3 style="margin: 0 0 12px 0; color: #991b1b;">What you can do</h3>
            <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
              <li style="${EMAIL_STYLES.listItem}">You may reapply in the future when circumstances change</li>
              <li style="${EMAIL_STYLES.listItem}">Contact our support team for specific feedback on your application</li>
              <li style="${EMAIL_STYLES.listItem}">Consider expanding your services or coverage area</li>
            </ul>
          `, 'error')}
          
          <p style="${EMAIL_STYLES.paragraph}">We appreciate your interest and encourage you to apply again in the future.</p>
          
          <p style="${EMAIL_STYLES.paragraph}">Best regards,<br><strong>The FixBudi Team</strong></p>
        `)
      };

    default:
      throw new Error("Invalid email type");
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: ConfirmationEmailRequest = await req.json();
    
    // Support both new and legacy API formats
    const email = requestBody.email || requestBody.to;
    const name = requestBody.name || requestBody.data?.name;
    const centerName = requestBody.centerName || requestBody.data?.businessName;
    const type = requestBody.type;
    const customSubject = requestBody.subject;
    const customMessage = requestBody.message;
    
    if (!email || !name || !type) {
      throw new Error("Missing required fields: email, name, and type are required");
    }
    
    console.log(`Processing ${type} email for ${email}`);

    const { subject: defaultSubject, html } = getEmailContent(type, name, centerName, customMessage);
    const subject = customSubject || defaultSubject;

    // Use Resend API directly
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FixBudi <noreply@fixbudi.com>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Resend API error: ${emailResponse.status} - ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult.id);

    // Log email delivery
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        const logResponse = await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "apikey": supabaseServiceKey,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            email_type: type,
            recipient_email: email,
            recipient_name: name,
            subject: subject,
            status: "sent",
            resend_id: emailResult.id,
            metadata: { center_name: centerName, center_id: requestBody.centerId },
          }),
        });
        
        if (!logResponse.ok) {
          console.error("Failed to log email:", await logResponse.text());
        }
      }
    } catch (logError) {
      console.error("Error logging email:", logError);
    }

    return new Response(JSON.stringify({ success: true, emailResponse: emailResult }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    
    // Log failed email attempt
    try {
      const requestBody: ConfirmationEmailRequest = await req.clone().json();
      const email = requestBody.email || requestBody.to;
      const name = requestBody.name || requestBody.data?.name;
      const type = requestBody.type;
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey && email && type) {
        await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "apikey": supabaseServiceKey,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            email_type: type,
            recipient_email: email,
            recipient_name: name,
            subject: "Failed to send",
            status: "failed",
            error_message: error.message,
          }),
        });
      }
    } catch (logError) {
      console.error("Error logging failed email:", logError);
    }
    
    const errorDetails = {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: errorDetails
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
