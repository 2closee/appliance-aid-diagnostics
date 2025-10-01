import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationData {
  businessName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  operatingHours: string;
  specialties: string;
  numberOfStaff: string;
  yearsInBusiness: string;
  cacName: string;
  cacNumber: string;
  taxId?: string;
  password: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting repair center application submission...');
    
    const applicationData: ApplicationData = await req.json();
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Step 1: Check if user already exists
    console.log('Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
      throw new Error(`Failed to check existing users: ${listError.message}`);
    }

    const existingUser = existingUsers.users.find(u => u.email === applicationData.email);
    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;
      
      // Check if this user already has an active repair center
      const { data: existingStaff } = await supabaseAdmin
        .from("repair_center_staff")
        .select("repair_center_id, is_active, Repair Center!inner(status)")
        .eq('user_id', userId)
        .single();

      if (existingStaff) {
        const centerStatus = (existingStaff as any)['Repair Center']?.status;
        
        if (centerStatus === 'active' || centerStatus === 'pending') {
          return new Response(
            JSON.stringify({
              success: false,
              error: "An application already exists for this email address. Please contact support if you need assistance."
            }),
            {
              status: 409,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }
      }

      // If user exists but no active center, allow resubmission
      // Check if email is verified
      if (!existingUser.email_confirmed_at) {
        console.log('Existing user email not verified, will resend verification');
      }
    } else {
      // Create new user
      console.log('Creating new user account...');
      const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: applicationData.email,
        password: applicationData.password,
        email_confirm: false,
        user_metadata: {
          full_name: applicationData.fullName,
          role: 'repair_center_staff'
        }
      });

      if (signUpError) {
        console.error('User creation error:', signUpError);
        throw new Error(`Failed to create user account: ${signUpError.message}`);
      }

      if (!authData.user) {
        throw new Error("User creation failed - no user returned");
      }

      userId = authData.user.id;
      isNewUser = true;
      console.log('New user created successfully:', userId);
    }

    // Step 2: Create repair center record using service role (bypasses RLS)
    console.log('Creating repair center record...');
    const { data: centerData, error: centerError } = await supabaseAdmin
      .from("Repair Center")
      .insert({
        name: applicationData.businessName,
        address: `${applicationData.address}, ${applicationData.city}, ${applicationData.state} ${applicationData.zipCode}`.trim(),
        phone: applicationData.phone,
        email: applicationData.email,
        hours: applicationData.operatingHours,
        specialties: applicationData.specialties,
        number_of_staff: parseInt(applicationData.numberOfStaff) || 0,
        years_of_experience: parseInt(applicationData.yearsInBusiness) || 0,
        cac_name: applicationData.cacName,
        cac_number: applicationData.cacNumber,
        tax_id: applicationData.taxId || null,
        status: 'pending_verification' // New status for unverified applications
      })
      .select()
      .single();

    if (centerError) {
      console.error('Center creation error:', centerError);
      // Cleanup: Delete the user only if we just created it
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw new Error(`Failed to create repair center: ${centerError.message}`);
    }

    console.log('Repair center created:', centerData.id);

    // Step 3: Create staff record using service role (bypasses RLS)
    console.log('Creating staff record...');
    const { error: staffError } = await supabaseAdmin
      .from("repair_center_staff")
      .insert({
        user_id: userId,
        repair_center_id: centerData.id,
        is_owner: true,
        is_active: false, // Not active until email is verified
        role: 'owner',
        created_by: userId
      });

    if (staffError) {
      console.error('Staff record creation error:', staffError);
      // Cleanup: Delete center and user only if we just created it
      await supabaseAdmin.from("Repair Center").delete().eq('id', centerData.id);
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw new Error(`Failed to create staff record: ${staffError.message}`);
    }

    console.log('Staff record created successfully');

    // Step 4: Generate email confirmation token
    console.log('Generating email confirmation token...');
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: applicationData.email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/repair-center-admin?verified=true`
      }
    });

    if (tokenError) {
      console.error('Token generation error:', tokenError);
      throw new Error(`Failed to generate verification token: ${tokenError.message}`);
    }

    // Step 5: Send verification email
    console.log('Sending verification email...');
    const emailResponse = await resend.emails.send({
      from: "FixBudi <noreply@resend.dev>",
      to: [applicationData.email],
      subject: "Verify Your Repair Center Application",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to FixBudi!</h1>
          <p>Thank you for applying to become an authorized repair center, ${applicationData.fullName}!</p>
          
          <p>Your application for <strong>${applicationData.businessName}</strong> has been received and is being processed.</p>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Click the verification link below to confirm your email address</li>
            <li>Our team will review your application within 24-48 hours</li>
            <li>You'll receive another email once your application is approved</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${tokenData.properties?.action_link}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't submit this application, please ignore this email.
          </p>
          
          <hr style="margin: 30px 0; border: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            FixBudi - Connecting customers with trusted repair centers
          </p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error('Email sending error:', emailResponse.error);
      // Don't fail the entire process if email fails, just log it
      console.log('Application created successfully, but email notification failed');
    } else {
      console.log('Verification email sent successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Application submitted successfully! Please check your email to verify your account.",
        repairCenterId: centerData.id,
        userId: userId,
        emailSent: !emailResponse.error
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
    console.error("Error in submit-repair-center-application function:", error);
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