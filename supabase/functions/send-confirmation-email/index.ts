import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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

    let subject: string;
    let html: string;

    switch (type) {
      case "support":
        subject = customSubject || "Support Request Received";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Thank You for Contacting FixBudi Support</h1>
            <p>Dear ${name},</p>
            <p>We have received your support request and our team will review it shortly.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Your Message:</h3>
              <p style="color: #6b7280; white-space: pre-wrap;">${customMessage || 'No message provided'}</p>
            </div>
            <p>We aim to respond to all inquiries within 24-48 hours. If your issue is urgent, please don't hesitate to call us directly.</p>
            <p>Best regards,<br>The FixBudi Support Team</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af;">
                Contact: support@fixbudi.com<br>
                Port Harcourt, Rivers State, Nigeria
              </p>
            </div>
          </div>
        `;
        break;
      case "custom":
        subject = customSubject || "Message from FixBudi Admin";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Message from FixBudi Admin</h1>
            <p>Dear ${name},</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${customMessage ? customMessage.replace(/\n/g, '<br>') : 'You have received a message from the FixBudi Admin team.'}
            </div>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The FixBudi Admin Team</p>
          </div>
        `;
        break;
      case "application":
        subject = "Repair Center Application Received";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Application Received</h1>
            <p>Dear ${name},</p>
            <p>Thank you for applying to join our repair center network with <strong>${centerName}</strong>.</p>
            <p>Your application has been received and is currently under review. Our team will carefully evaluate your submission and get back to you within 3-5 business days.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">What happens next?</h3>
              <ul style="color: #6b7280;">
                <li>Our team will review your application and verify your credentials</li>
                <li>We may contact you for additional information if needed</li>
                <li>You'll receive an email notification once a decision is made</li>
                <li>If approved, you'll gain access to our repair center portal</li>
              </ul>
            </div>
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The FixBudi Team</p>
          </div>
        `;
        break;
      case "approval":
        subject = "Repair Center Application Approved";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #059669;">Application Approved!</h1>
            <p>Dear ${name},</p>
            <p>Congratulations! Your repair center application for <strong>${centerName}</strong> has been approved.</p>
            <p>You can now access your repair center dashboard and start receiving repair requests from customers.</p>
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3 style="margin-top: 0; color: #047857;">Getting Started</h3>
              <ul style="color: #065f46;">
                <li>Log in to your repair center portal</li>
                <li>Complete your center profile with operating hours and specialties</li>
                <li>Start receiving and managing repair requests</li>
                <li>Track your earnings and performance</li>
              </ul>
            </div>
            <p>Welcome to the FixBudi repair center network!</p>
            <p>Best regards,<br>The FixBudi Team</p>
          </div>
        `;
        break;
      case "rejection":
        subject = "Repair Center Application Update";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Application Update</h1>
            <p>Dear ${name},</p>
            <p>Thank you for your interest in joining our repair center network with <strong>${centerName}</strong>.</p>
            <p>After careful review, we are unable to approve your application at this time. This decision may be based on various factors including location coverage, capacity, or specific requirements not being met.</p>
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin-top: 0; color: #991b1b;">What you can do</h3>
              <ul style="color: #7f1d1d;">
                <li>You may reapply in the future when circumstances change</li>
                <li>Contact our support team for specific feedback on your application</li>
                <li>Consider expanding your services or coverage area</li>
              </ul>
            </div>
            <p>We appreciate your interest and encourage you to apply again in the future.</p>
            <p>Best regards,<br>The FixBudi Team</p>
          </div>
        `;
        break;
      default:
        throw new Error("Invalid email type");
    }

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
    
    // Provide specific error details for debugging
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