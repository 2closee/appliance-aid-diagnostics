import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchProcessRequest {
  payout_ids: string[];
  payout_method: string;
  payout_reference: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { payout_ids, payout_method, payout_reference, notes }: BatchProcessRequest = await req.json();

    if (!payout_ids || payout_ids.length === 0) {
      throw new Error('No payout IDs provided');
    }

    if (!payout_method || !payout_reference) {
      throw new Error('Payout method and reference are required');
    }

    console.log(`Processing ${payout_ids.length} payouts in batch`);

    // Fetch all payouts to process
    const { data: payouts, error: fetchError } = await supabase
      .from('repair_center_payouts')
      .select('*, repair_center_bank_accounts!inner(*)')
      .in('id', payout_ids)
      .eq('payout_status', 'pending');

    if (fetchError) {
      console.error('Error fetching payouts:', fetchError);
      throw new Error(`Failed to fetch payouts: ${fetchError.message}`);
    }

    if (!payouts || payouts.length === 0) {
      throw new Error('No valid pending payouts found');
    }

    // Check that all payouts have whitelisted bank accounts
    const payoutsWithoutAccounts = payouts.filter(p => !p.repair_center_bank_accounts);
    if (payoutsWithoutAccounts.length > 0) {
      throw new Error(`${payoutsWithoutAccounts.length} payout(s) missing whitelisted bank accounts`);
    }

    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // Process each payout
    for (const payout of payouts) {
      try {
        // Update payout status
        const { error: updateError } = await supabase
          .from('repair_center_payouts')
          .update({
            payout_status: 'completed',
            payout_method,
            payout_reference: `${payout_reference}-${payout.id.substring(0, 8)}`,
            payout_date: new Date().toISOString(),
            notes: notes || `Batch processed on ${new Date().toLocaleDateString()}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        if (updateError) {
          console.error(`Error updating payout ${payout.id}:`, updateError);
          results.failed.push({ id: payout.id, error: updateError.message });
          continue;
        }

        // Send notification email
        await supabase.functions.invoke('send-job-notification', {
          body: {
            type: 'payout_processed',
            repair_center_email: payout.repair_center_bank_accounts.account_name,
            repair_center_name: payout.repair_center_bank_accounts.account_name,
            data: {
              payout_amount: payout.net_amount,
              currency: payout.currency,
              payout_reference: `${payout_reference}-${payout.id.substring(0, 8)}`,
              payout_method,
              settlement_period: payout.settlement_period,
              bank_name: payout.repair_center_bank_accounts.bank_name,
              account_number: payout.repair_center_bank_accounts.account_number,
              account_name: payout.repair_center_bank_accounts.account_name,
            },
          },
        });

        results.successful.push(payout.id);
        console.log(`Successfully processed payout ${payout.id}`);
      } catch (error) {
        console.error(`Error processing payout ${payout.id}:`, error);
        results.failed.push({ 
          id: payout.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log(`Batch processing completed: ${results.successful.length} successful, ${results.failed.length} failed`);

    return new Response(
      JSON.stringify({
        message: 'Batch processing completed',
        results,
        total: payouts.length,
        successful_count: results.successful.length,
        failed_count: results.failed.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in batch-process-payouts:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});