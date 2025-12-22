import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { Resend } from "npm:resend@2.0.0";
import { 
  wrapEmailTemplate, 
  createButton, 
  createBox, 
  EMAIL_STYLES,
  BRAND_COLORS 
} from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    console.log('Processing password reset request for:', email);

    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      throw new Error('Failed to check user existence');
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      // For security, we still return success even if user doesn't exist
      console.log('User not found, but returning success for security');
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a password reset link has been sent.' }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://fixbudi.com/repair-center-admin',
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      throw new Error('Failed to generate password reset link');
    }

    console.log('Password reset link generated successfully');

    // Build the email HTML using the shared template
    const emailHtml = wrapEmailTemplate(`
      <h2 style="${EMAIL_STYLES.h1}">Reset Your Password</h2>
      <p style="${EMAIL_STYLES.paragraph}">We received a request to reset your password for your FixBudi repair center account.</p>
      
      <div style="text-align: center; margin: 35px 0;">
        ${createButton('Reset Password', resetData.properties.action_link)}
      </div>
      
      ${createBox(`
        <p style="margin: 0;"><strong>🔒 Security Note:</strong> This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.</p>
      `, 'warning')}
      
      <p style="${EMAIL_STYLES.paragraph}; text-align: center; margin-top: 30px;">
        <strong>The FixBudi Team</strong>
      </p>
    `);

    // Send email using Resend
    const emailResult = await resend.emails.send({
      from: "FixBudi <noreply@fixbudi.com>",
      to: [email],
      subject: "Reset Your FixBudi Password",
      html: emailHtml,
    });

    console.log('Password reset email sent successfully:', emailResult.id);

    // Log email delivery
    try {
      const { error: logError } = await supabaseAdmin
        .from('email_logs')
        .insert({
          email_type: 'password_reset',
          recipient_email: email,
          subject: 'Reset Your FixBudi Password',
          status: 'sent',
          resend_id: emailResult.id,
        });
      
      if (logError) {
        console.error('Failed to log email:', logError);
      }
    } catch (logError) {
      console.error('Error logging email:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset link has been sent to your email.',
        emailId: emailResult.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-password-reset function:', error);
    
    // Log failed email attempt
    try {
      const { email } = await req.clone().json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      if (email) {
        await supabaseAdmin
          .from('email_logs')
          .insert({
            email_type: 'password_reset',
            recipient_email: email,
            subject: 'Reset Your FixBudi Password',
            status: 'failed',
            error_message: error.message,
          });
      }
    } catch (logError) {
      console.error('Error logging failed email:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while processing your request',
        success: false
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
