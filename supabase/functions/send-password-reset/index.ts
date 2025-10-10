import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { Resend } from "npm:resend@2.0.0";

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
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/repair-center-admin`,
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      throw new Error('Failed to generate password reset link');
    }

    console.log('Password reset link generated successfully');

    // Send email using Resend
    // IMPORTANT: Change 'onboarding@resend.dev' to your verified domain email (e.g., 'noreply@yourdomain.com')
    // Verify your domain at: https://resend.com/domains
    const emailResult = await resend.emails.send({
      from: "Fixbudi <onboarding@resend.dev>",
      to: [email],
      subject: "Reset Your Fixbudi Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #2563eb; margin-top: 0;">Reset Your Password</h1>
            <p style="font-size: 16px;">We received a request to reset your password for your Fixbudi repair center account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetData.properties.action_link}" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
              </p>
            </div>
            
            <p style="text-align: center; color: #6b7280; margin-top: 30px;">
              <strong>The Fixbudi Team</strong>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Password reset email sent successfully:', emailResult.id);

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
