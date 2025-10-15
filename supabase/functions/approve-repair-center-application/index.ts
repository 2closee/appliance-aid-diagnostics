import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Generate random password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId, email, fullName, businessName } = await req.json();
    
    console.log('Approving application:', applicationId);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Get application details
    const { data: application, error: appError } = await supabaseAdmin
      .from("repair_center_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      throw new Error("Application not found");
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);
    
    let userData: any;
    let tempPassword: string | null = null;
    let isNewUser = false;

    if (existingUser) {
      // User exists - update metadata and send password reset email
      console.log('User already exists, updating metadata and sending password reset email:', email);
      
      // Update user metadata to require password change
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            ...existingUser.user_metadata,
            force_password_change: true,
            business_name: businessName
          }
        }
      );

      if (updateError) {
        console.error('User metadata update error:', updateError);
        throw new Error(`Failed to update user metadata: ${updateError.message}`);
      }
      
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/repair-center-admin`
      });

      if (resetError) {
        console.error('Password reset error:', resetError);
        throw new Error(`Failed to send password reset: ${resetError.message}`);
      }

      userData = { user: existingUser };
      console.log('Password reset email sent to existing user:', existingUser.id);
    } else {
      // New user - create account with temporary password
      isNewUser = true;
      tempPassword = generateTemporaryPassword();
      console.log('Creating new user account for:', email);

      const { data: newUserData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          force_password_change: true,
          business_name: businessName
        }
      });

      if (userError || !newUserData.user) {
        console.error('User creation error:', userError);
        throw new Error(`Failed to create user account: ${userError?.message}`);
      }

      userData = newUserData;
      console.log('User created successfully:', userData.user.id);
    }

    // Create repair center record
    const { data: centerData, error: centerError } = await supabaseAdmin
      .from("Repair Center")
      .insert({
        name: application.business_name,
        address: `${application.address}, ${application.city}, ${application.state} ${application.zip_code}`,
        phone: application.phone,
        email: application.email,
        hours: application.operating_hours,
        specialties: application.specialties,
        number_of_staff: application.number_of_staff,
        years_of_experience: application.years_in_business,
        cac_name: application.cac_name,
        cac_number: application.cac_number,
        tax_id: application.tax_id,
        status: 'active'
      })
      .select()
      .single();

    if (centerError || !centerData) {
      console.error('Center creation error:', centerError);
      throw new Error(`Failed to create repair center: ${centerError?.message}`);
    }

    console.log('Repair center created:', centerData.id);

    // Create staff record
    const { error: staffError } = await supabaseAdmin
      .from("repair_center_staff")
      .insert({
        user_id: userData.user.id,
        repair_center_id: centerData.id,
        is_active: true,
        is_owner: true,
        role: 'owner'
      });

    if (staffError) {
      console.error('Staff creation error:', staffError);
      throw new Error(`Failed to create staff record: ${staffError.message}`);
    }

    // Update application status
    await supabaseAdmin
      .from("repair_center_applications")
      .update({ status: 'approved' })
      .eq("id", applicationId);

    // Send approval email
    console.log('Sending approval email...');
    
    try {
      const emailResult = await resend.emails.send({
        from: "Fixbudi <noreply@fixbudi.com>",
        to: [email],
        subject: "Your Repair Center Application Has Been Approved!",
        html: isNewUser ? `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Application Approved</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #2563eb; margin-top: 0;">Congratulations, ${fullName}!</h1>
              <p style="font-size: 16px;">Your repair center application for <strong>${businessName}</strong> has been approved!</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <h2 style="color: #1e40af; margin-top: 0;">Your Login Credentials</h2>
                <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${tempPassword}</code></p>
              </div>
              
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ IMPORTANT:</strong> For security reasons, you will be required to change this password when you first log in.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/repair-center-admin" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Access Your Portal
                </a>
              </div>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Next Steps:</h3>
                <ol style="margin: 0; padding-left: 20px;">
                  <li style="margin: 8px 0;">Log in using the credentials above</li>
                  <li style="margin: 8px 0;">Change your password when prompted</li>
                  <li style="margin: 8px 0;">Complete your center profile</li>
                  <li style="margin: 8px 0;">Start receiving repair requests!</li>
                </ol>
              </div>
              
              <p style="text-align: center; color: #6b7280; margin-top: 30px;">
                Welcome to the Fixbudi network!<br>
                <strong>The Fixbudi Team</strong>
              </p>
            </div>
          </body>
          </html>
        ` : `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Application Approved</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #2563eb; margin-top: 0;">Congratulations, ${fullName}!</h1>
              <p style="font-size: 16px;">Your repair center application for <strong>${businessName}</strong> has been approved!</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <h2 style="color: #1e40af; margin-top: 0;">Access Your Portal</h2>
                <p>Since you already have an account with us, we've sent you a password reset link to ensure secure access to your new repair center portal.</p>
                <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
              </div>
              
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ IMPORTANT:</strong> Check your email for the password reset link. Use it to set a new password and access your repair center portal.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/repair-center-admin" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Go to Portal
                </a>
              </div>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Next Steps:</h3>
                <ol style="margin: 0; padding-left: 20px;">
                  <li style="margin: 8px 0;">Check your email for the password reset link</li>
                  <li style="margin: 8px 0;">Set your new password</li>
                  <li style="margin: 8px 0;">Log in to your repair center portal</li>
                  <li style="margin: 8px 0;">Complete your center profile</li>
                  <li style="margin: 8px 0;">Start receiving repair requests!</li>
                </ol>
              </div>
              
              <p style="text-align: center; color: #6b7280; margin-top: 30px;">
                Welcome to the Fixbudi network!<br>
                <strong>The Fixbudi Team</strong>
              </p>
            </div>
          </body>
          </html>
        `,
      });
      
      console.log('Approval email sent successfully. Result:', JSON.stringify(emailResult));
      
      if (emailResult.error) {
        console.error('Resend API returned error:', emailResult.error);
        throw new Error(`Email sending failed: ${emailResult.error.message || 'Unknown error'}`);
      }
      
    } catch (emailError: any) {
      console.error("Email sending failed with error:", emailError);
      console.error("Error details:", JSON.stringify(emailError, null, 2));
      
      // Throw error so the frontend knows email failed
      throw new Error(`Failed to send approval email: ${emailError.message || 'Please verify your Resend domain at https://resend.com/domains'}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Application approved and credentials sent",
        userId: userData.user.id,
        centerId: centerData.id
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in approve-repair-center-application:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
