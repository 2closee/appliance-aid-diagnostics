import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map SendStack statuses to internal statuses
const statusMap: Record<string, string> = {
  'pending': 'pending',
  'assigned': 'assigned',
  'accepted': 'assigned',
  'en_route_to_pickup': 'driver_on_way',
  'arrived_at_pickup': 'driver_arrived',
  'picked_up': 'picked_up',
  'in_transit': 'in_transit',
  'arrived_at_destination': 'driver_arrived',
  'delivered': 'delivered',
  'failed': 'failed',
  'cancelled': 'cancelled',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookData = await req.json();
    console.log('SendStack webhook received:', webhookData);

    // Extract delivery information from webhook
    const deliveryId = webhookData.delivery_id || webhookData.id;
    const status = webhookData.status;
    const driverInfo = webhookData.driver;
    const location = webhookData.location;

    if (!deliveryId) {
      throw new Error('No delivery_id in webhook payload');
    }

    // Find delivery request by provider order ID
    const { data: deliveryRequest, error: findError } = await supabase
      .from('delivery_requests')
      .select('*, repair_jobs(*)')
      .eq('provider_order_id', deliveryId)
      .single();

    if (findError || !deliveryRequest) {
      console.error('Delivery request not found:', deliveryId);
      throw new Error('Delivery request not found');
    }

    const mappedStatus = statusMap[status] || status;
    console.log(`Updating delivery ${deliveryRequest.id} status: ${status} -> ${mappedStatus}`);

    // Prepare update data
    const updateData: any = {
      delivery_status: mappedStatus,
      driver_name: driverInfo?.name,
      driver_phone: driverInfo?.phone,
      vehicle_details: driverInfo?.vehicle_details,
      updated_at: new Date().toISOString(),
    };

    // Set pickup/delivery times
    if (mappedStatus === 'picked_up' && !deliveryRequest.actual_pickup_time) {
      updateData.actual_pickup_time = new Date().toISOString();
    }
    
    if (mappedStatus === 'delivered' && !deliveryRequest.actual_delivery_time) {
      updateData.actual_delivery_time = new Date().toISOString();
      // Auto-confirm payment when delivered (driver confirms delivery)
      updateData.cash_payment_status = 'confirmed';
      updateData.cash_payment_confirmed_at = new Date().toISOString();
      updateData.cash_payment_confirmed_by = 'driver';
    }

    // Get actual cost from payload if available
    if (webhookData.cost || webhookData.final_cost || webhookData.amount) {
      const actualCost = webhookData.cost || webhookData.final_cost || webhookData.amount;
      updateData.actual_cost = actualCost;
      updateData.app_delivery_commission = actualCost * 0.05;
    }

    // Update the delivery request with the new status
    const { error: updateError } = await supabase
      .from('delivery_requests')
      .update(updateData)
      .eq('id', deliveryRequest.id);

    if (updateError) {
      console.error('Failed to update delivery request:', updateError);
      throw updateError;
    }

    // Insert status history
    await supabase
      .from('delivery_status_history')
      .insert({
        delivery_request_id: deliveryRequest.id,
        status: mappedStatus,
        location: location ? {
          lat: location.latitude,
          lng: location.longitude,
          address: location.address,
        } : null,
        notes: webhookData.notes || `Status updated to ${mappedStatus}`,
      });

      // Update repair job status if delivery is complete
      if (mappedStatus === 'delivered' && deliveryRequest.repair_jobs) {
        const job = deliveryRequest.repair_jobs;
        
        if (deliveryRequest.delivery_type === 'pickup' && job.job_status === 'quote_accepted') {
          await supabase
            .from('repair_jobs')
            .update({ job_status: 'pickup_scheduled' })
            .eq('id', deliveryRequest.repair_job_id);
          
          console.log('Updated job status to pickup_scheduled');
        } else if (deliveryRequest.delivery_type === 'return' && job.job_status === 'repair_completed') {
          await supabase
            .from('repair_jobs')
            .update({ job_status: 'ready_for_return' })
            .eq('id', deliveryRequest.repair_job_id);
          
          console.log('Updated job status to ready_for_return');
        }
      }

    return new Response(
      JSON.stringify({ success: true, status: mappedStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SendStack webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
