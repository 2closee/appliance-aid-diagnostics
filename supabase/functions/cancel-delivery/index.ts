import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terminalApiKey = Deno.env.get('TERMINAL_AFRICA_API_KEY')!;
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { delivery_request_id, reason } = await req.json();

    console.log('Cancelling Terminal Africa delivery:', delivery_request_id);

    // Get delivery request
    const { data: delivery, error: fetchError } = await supabase
      .from('delivery_requests')
      .select('*, repair_jobs(*)')
      .eq('id', delivery_request_id)
      .single();

    if (fetchError || !delivery) {
      throw new Error('Delivery request not found');
    }

    // Check user has permission
    const isCustomer = delivery.repair_jobs.user_id === user.id;
    const { data: isStaff } = await supabase.rpc('is_staff_at_center', {
      _user_id: user.id,
      _center_id: delivery.repair_jobs.repair_center_id
    });

    if (!isCustomer && !isStaff) {
      throw new Error('Unauthorized to cancel this delivery');
    }

    // Check if delivery can be cancelled (not yet picked up)
    if (['picked_up', 'in_transit', 'delivered'].includes(delivery.delivery_status)) {
      throw new Error('Cannot cancel delivery - already in progress or completed');
    }

    // Cancel with Terminal Africa
    const cancelResponse = await fetch(
      `https://api.terminal.africa/v1/shipments/${delivery.provider_order_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${terminalApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Customer requested cancellation' }),
      }
    );

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error('Terminal Africa cancel error:', errorText);
      throw new Error(`Failed to cancel with Terminal Africa: ${cancelResponse.status}`);
    }

    // Update database
    const { error: updateError } = await supabase
      .from('delivery_requests')
      .update({
        delivery_status: 'cancelled',
        notes: `Cancelled: ${reason || 'Customer request'}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', delivery_request_id);

    if (updateError) {
      throw updateError;
    }

    // Insert status history
    await supabase
      .from('delivery_status_history')
      .insert({
        delivery_request_id,
        status: 'cancelled',
        notes: reason || 'Customer requested cancellation',
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Delivery cancelled successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error cancelling Terminal Africa delivery:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
