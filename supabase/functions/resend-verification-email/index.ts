import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";
import { 
  wrapEmailTemplate, 
  createBox, 
  createDetailsTable,
  createBadge,
  EMAIL_STYLES,
  BRAND_COLORS 
} from "../_shared/email-template.ts";

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

    // Build the email HTML using the shared template
    const emailHtml = wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Application Received!</h2>
      <p style="${EMAIL_STYLES.paragraph}">Thank you for applying to join the FixBudi Repair Center Network.</p>
      
      ${createBox(`
        <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLORS.primary};">Application Details</h3>
        ${createDetailsTable([
          { label: 'Business Name', value: application.business_name },
          { label: 'Contact Person', value: application.full_name },
          { label: 'Email', value: application.email },
          { label: 'Phone', value: application.phone },
          { label: 'Location', value: `${application.city}, ${application.state}` },
          { label: 'Specialties', value: application.specialties },
          { label: 'Status', value: createBadge('Under Review', 'pending') },
        ])}
      `, 'info')}
      
      ${createBox(`
        <h4 style="margin: 0 0 12px 0; color: #166534;">What Happens Next?</h4>
        <ol style="margin: 0; padding-left: 20px; color: #047857;">
          <li style="margin-bottom: 8px;">Our team will review your application within 2-3 business days</li>
          <li style="margin-bottom: 8px;">We may contact you for additional information or verification</li>
          <li style="margin-bottom: 8px;">Once approved, you'll receive login credentials via email</li>
          <li>You can then set up your repair center profile and start receiving repair requests</li>
        </ol>
      `, 'success')}
      
      <p style="${EMAIL_STYLES.paragraph}">If you have any questions, please don't hesitate to contact our support team.</p>
    `);

    // Send confirmation email using Resend
    const resend = new Resend(resendApiKey);
    
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "FixBudi <noreply@fixbudi.com>",
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
