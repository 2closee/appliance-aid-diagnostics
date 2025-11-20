import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AddressChangeNotification {
  repair_center_id: number;
  old_address: string;
  new_address: string;
  changed_by_admin: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { repair_center_id, old_address, new_address, changed_by_admin }: AddressChangeNotification = await req.json();

    console.log("Sending address change notification for center:", repair_center_id);

    // Fetch repair center details
    const { data: center, error: centerError } = await supabaseAdmin
      .from("Repair Center")
      .select("name, email")
      .eq("id", repair_center_id)
      .single();

    if (centerError || !center) {
      throw new Error(`Failed to fetch repair center: ${centerError?.message}`);
    }

    // Fetch all active staff emails for this center
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("repair_center_staff")
      .select("user_id")
      .eq("repair_center_id", repair_center_id)
      .eq("is_active", true);

    if (staffError) {
      console.error("Failed to fetch staff:", staffError);
    }

    // Get staff emails from auth.users
    const staffEmails: string[] = [];
    if (staff && staff.length > 0) {
      for (const staffMember of staff) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(staffMember.user_id);
        if (userData?.user?.email) {
          staffEmails.push(userData.user.email);
        }
      }
    }

    // Add center email if available
    const recipientEmails = center.email ? [...staffEmails, center.email] : staffEmails;
    
    // Remove duplicates
    const uniqueEmails = [...new Set(recipientEmails)];

    if (uniqueEmails.length === 0) {
      console.warn("No recipient emails found for address change notification");
      return new Response(
        JSON.stringify({ message: "No recipients to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Notifying ${uniqueEmails.length} recipients about address change`);

    // Send email to all recipients
    const emailPromises = uniqueEmails.map(email => 
      resend.emails.send({
        from: "FixBudi <notifications@resend.dev>",
        to: [email],
        subject: `${center.name} - Address Updated`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Address Update Notification</h2>
            <p>The address for <strong>${center.name}</strong> has been updated.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Old Address:</strong></p>
              <p style="margin: 5px 0; color: #666;">${old_address}</p>
              
              <p style="margin: 15px 0 5px 0;"><strong>New Address:</strong></p>
              <p style="margin: 5px 0; color: #2563eb; font-weight: 500;">${new_address}</p>
            </div>

            <p style="color: #666; font-size: 14px;">
              ${changed_by_admin 
                ? "This change was made by a system administrator." 
                : "This change was made by a repair center staff member."}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions about this change, please contact support.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated notification from FixBudi.
            </p>
          </div>
        `,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    console.log(`Email notifications sent: ${successful} successful, ${failed} failed`);

    // Log the email notification
    await supabaseAdmin.from("email_logs").insert({
      email_type: "address_change_notification",
      recipient_email: uniqueEmails.join(", "),
      recipient_name: center.name,
      subject: `${center.name} - Address Updated`,
      status: failed === 0 ? "sent" : "partial_failure",
      metadata: {
        repair_center_id,
        old_address,
        new_address,
        changed_by_admin,
        successful,
        failed
      }
    });

    return new Response(
      JSON.stringify({ 
        message: "Notifications sent",
        successful,
        failed
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending address change notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
