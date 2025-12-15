import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResendVerificationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: ResendVerificationRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required", code: "MISSING_EMAIL" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Resending confirmation email to: ${email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured", code: "EMAIL_SERVICE_ERROR" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Query repair_center_applications for the email
    const { data: application, error: queryError } = await supabaseAdmin
      .from("repair_center_applications")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (queryError || !application) {
      console.log(`No application found for email: ${email}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No application found for this email address", 
          code: "APPLICATION_NOT_FOUND" 
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check application status
    if (application.status === "approved") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Your application has already been approved. Please check your email for login credentials.",
          code: "ALREADY_APPROVED" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (application.status === "rejected") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "This application was not approved. Please contact support for more information.",
          code: "APPLICATION_REJECTED" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: Check recent resend attempts (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: rateError } = await supabaseAdmin
      .from("email_logs")
      .select("id")
      .eq("recipient_email", email.toLowerCase().trim())
      .eq("email_type", "application_confirmation_resend")
      .gte("created_at", oneHourAgo);

    if (!rateError && recentAttempts && recentAttempts.length >= 3) {
      console.log(`Rate limit exceeded for: ${email}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many resend attempts. Please wait an hour before trying again.",
          code: "RATE_LIMITED" 
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send confirmation email using Resend
    const resend = new Resend(resendApiKey);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Received - FixBudi</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">FixBudi</h1>
          <p style="color: #666; margin: 5px 0;">Repair Center Network</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; font-size: 24px;">Application Received!</h2>
          <p style="margin: 0; opacity: 0.9;">Thank you for applying to join the FixBudi network</p>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
          <h3 style="color: #10b981; margin: 0 0 15px 0;">Application Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 40%;">Business Name:</td>
              <td style="padding: 8px 0; font-weight: 500;">${application.business_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Contact Person:</td>
              <td style="padding: 8px 0; font-weight: 500;">${application.full_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email:</td>
              <td style="padding: 8px 0; font-weight: 500;">${application.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Phone:</td>
              <td style="padding: 8px 0; font-weight: 500;">${application.phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Location:</td>
              <td style="padding: 8px 0; font-weight: 500;">${application.city}, ${application.state}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Specialties:</td>
              <td style="padding: 8px 0; font-weight: 500;">${application.specialties}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Status:</td>
              <td style="padding: 8px 0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500;">Under Review</span></td>
            </tr>
          </table>
        </div>
        
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
          <h4 style="color: #065f46; margin: 0 0 10px 0;">What Happens Next?</h4>
          <ol style="margin: 0; padding-left: 20px; color: #047857;">
            <li style="margin-bottom: 8px;">Our team will review your application within 2-3 business days</li>
            <li style="margin-bottom: 8px;">We may contact you for additional information or verification</li>
            <li style="margin-bottom: 8px;">Once approved, you'll receive login credentials via email</li>
            <li>You can then set up your repair center profile and start receiving repair requests</li>
          </ol>
        </div>
        
        <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
          <p style="color: #666; margin: 0 0 10px 0;">Questions? Contact us at</p>
          <a href="mailto:support@fixbudi.com" style="color: #10b981; text-decoration: none; font-weight: 500;">support@fixbudi.com</a>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} FixBudi. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "FixBudi <onboarding@resend.dev>",
      to: [email],
      subject: "Application Received - FixBudi Repair Center Network",
      html: emailHtml,
    });

    // Log the attempt
    await supabaseAdmin.from("email_logs").insert({
      email_type: "application_confirmation_resend",
      recipient_email: email.toLowerCase().trim(),
      recipient_name: application.full_name,
      subject: "Application Received - FixBudi Repair Center Network",
      status: emailError ? "failed" : "sent",
      error_message: emailError?.message || null,
      resend_id: emailResult?.id || null,
      metadata: { 
        application_id: application.id,
        resent_at: new Date().toISOString()
      },
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to send email. Please try again later.",
          code: "EMAIL_SEND_FAILED" 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Confirmation email resent successfully to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email sent successfully. Please check your inbox and spam folder."
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in resend-verification-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "An unexpected error occurred. Please try again later.",
        code: "INTERNAL_ERROR"
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
