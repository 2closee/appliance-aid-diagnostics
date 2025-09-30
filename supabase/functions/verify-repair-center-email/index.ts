import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing email verification...');
    
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Step 1: Verify the user exists and email is confirmed
    console.log('Checking user verification status...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      throw new Error("User not found");
    }

    if (!userData.user.email_confirmed_at) {
      throw new Error("Email not yet verified");
    }

    console.log('Email verified for user:', userId);

    // Step 2: Activate the staff record
    console.log('Activating staff record...');
    const { error: staffActivationError } = await supabaseAdmin
      .from("repair_center_staff")
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (staffActivationError) {
      console.error('Staff activation error:', staffActivationError);
      throw new Error(`Failed to activate staff record: ${staffActivationError.message}`);
    }

    // Step 3: Update repair center status from pending_verification to pending
    console.log('Updating repair center status...');
    const { error: centerUpdateError } = await supabaseAdmin
      .from("Repair Center")
      .update({ status: 'pending' })
      .eq('id', (await supabaseAdmin
        .from("repair_center_staff")
        .select('repair_center_id')
        .eq('user_id', userId)
        .single()
      ).data?.repair_center_id);

    if (centerUpdateError) {
      console.error('Center status update error:', centerUpdateError);
      throw new Error(`Failed to update center status: ${centerUpdateError.message}`);
    }

    console.log('Email verification completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email verified successfully! Your application is now under review.",
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
    console.error("Error in verify-repair-center-email function:", error);
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