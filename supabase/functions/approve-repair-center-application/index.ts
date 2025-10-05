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

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    console.log('Generated temporary password for:', email);

    // Create user account with temporary password
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        force_password_change: true,
        business_name: businessName
      }
    });

    if (userError || !userData.user) {
      console.error('User creation error:', userError);
      throw new Error(`Failed to create user account: ${userError?.message}`);
    }

    console.log('User created successfully:', userData.user.id);

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

    // Send approval email with credentials
    console.log('Sending approval email with credentials...');
    
    try {
      await resend.emails.send({
        from: "Fixbudi <onboarding@resend.dev>",
        to: [email],
        subject: "Your Repair Center Application Has Been Approved!",
        html: `
          <h1>Congratulations, ${fullName}!</h1>
          <p>Your repair center application for <strong>${businessName}</strong> has been approved!</p>
          
          <h2>Your Login Credentials</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          
          <p><strong>IMPORTANT:</strong> For security reasons, you will be required to change this password when you first log in.</p>
          
          <p>You can access your repair center admin portal at:</p>
          <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://id-preview--')}/repair-center-admin">Repair Center Portal</a></p>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Log in using the credentials above</li>
            <li>Change your password when prompted</li>
            <li>Complete your center profile</li>
            <li>Start receiving repair requests!</li>
          </ol>
          
          <p>Welcome to the Fixbudi network!</p>
          <p>Best regards,<br>The Fixbudi Team</p>
        `,
      });
      console.log('Approval email sent successfully');
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the whole operation if email fails
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
