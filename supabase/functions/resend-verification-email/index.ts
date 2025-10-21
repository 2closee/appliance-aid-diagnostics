import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResendVerificationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: ResendVerificationRequest = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Resending verification email to: ${email}`);

    // Create Supabase admin client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw new Error("Failed to find user");
    }

    const user = users?.find(u => u.email === email);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Check if email is already confirmed
    if (user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Email is already verified",
          alreadyVerified: true 
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Generate new email confirmation token and send email
    const { error: resendError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${Deno.env.get("SUPABASE_URL").replace("https://esbqtuljvejvrzawsqgk.supabase.co", "https://fixbudi.com")}/verify-email`,
      }
    });

    if (resendError) {
      console.error("Error generating verification link:", resendError);
      throw new Error(`Failed to send verification email: ${resendError.message}`);
    }

    console.log(`Verification email sent successfully to ${email}`);

    // Log the email resend
    try {
      const { error: logError } = await supabaseAdmin
        .from("email_logs")
        .insert({
          email_type: "verification_resend",
          recipient_email: email,
          recipient_name: user.user_metadata?.full_name || "User",
          subject: "Verify your email address",
          status: "sent",
          metadata: { 
            user_id: user.id,
            resent_at: new Date().toISOString()
          },
        });

      if (logError) {
        console.error("Failed to log email:", logError);
      }
    } catch (logError) {
      console.error("Error logging email:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent successfully. Please check your inbox and spam folder."
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
    console.error("Error in resend-verification-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
