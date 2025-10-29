import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Access denied: Admin privileges required");
    }

    logStep("Admin verified", { userId: user.id });

    // Parse request body
    const { payout_id, payout_reference, payout_method, notes } = await req.json();

    if (!payout_id || !payout_reference) {
      throw new Error("Missing required fields: payout_id and payout_reference");
    }

    logStep("Processing payout", { payout_id, payout_reference });

    // Get payout details before updating
    const { data: payout, error: payoutFetchError } = await supabaseClient
      .from("repair_center_payouts")
      .select(`
        *,
        repair_center:Repair Center(id, name, email)
      `)
      .eq("id", payout_id)
      .single();

    if (payoutFetchError || !payout) {
      throw new Error("Payout not found");
    }

    // Check if repair center has a whitelisted bank account
    const { data: bankAccount, error: bankError } = await supabaseClient
      .from("repair_center_bank_accounts")
      .select("*")
      .eq("repair_center_id", payout.repair_center?.id)
      .eq("is_active", true)
      .maybeSingle();

    if (bankError) {
      logStep("Bank account fetch error", { error: bankError });
      throw new Error("Failed to fetch bank account information");
    }

    if (!bankAccount) {
      throw new Error("No whitelisted bank account found for this repair center. Please add bank account details before processing payouts.");
    }

    logStep("Bank account verified", { 
      bank_name: bankAccount.bank_name, 
      account_number: `****${bankAccount.account_number.slice(-4)}` 
    });

    // Update payout status
    const { error: updateError } = await supabaseClient
      .from("repair_center_payouts")
      .update({
        payout_status: "completed",
        payout_method: payout_method || "bank_transfer",
        payout_reference: payout_reference,
        payout_date: new Date().toISOString(),
        notes: notes || null,
      })
      .eq("id", payout_id);

    if (updateError) {
      logStep("Update failed", { error: updateError });
      throw updateError;
    }

    logStep("Payout updated successfully");

    // Send notification email to repair center
    try {
      await supabaseClient.functions.invoke("send-job-notification", {
        body: {
          email_type: "payout_processed",
          repair_center_email: payout.repair_center?.email,
          repair_center_name: payout.repair_center?.name,
          payout_amount: payout.net_amount,
          payout_reference: payout_reference,
          payout_date: new Date().toISOString(),
          bank_name: bankAccount.bank_name,
          account_number: `****${bankAccount.account_number.slice(-4)}`,
          account_name: bankAccount.account_name,
        },
      });
      logStep("Notification email sent");
    } catch (emailError) {
      logStep("Email notification failed", { error: emailError });
      // Don't fail the entire request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payout processed successfully",
        payout_id: payout_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
