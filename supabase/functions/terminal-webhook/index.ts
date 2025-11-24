import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map Terminal Africa statuses to our internal statuses
const statusMap: Record<string, string> = {
  'confirmed': 'pending',
  'picked-up': 'picked_up',
  'in-transit': 'in_transit',
  'out-for-delivery': 'in_transit',
  'delivered': 'delivered',
  'cancelled': 'cancelled',
  'failed': 'failed',
  'returned': 'returned',
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
    console.log('Terminal Africa webhook received:', JSON.stringify(webhookData, null, 2));

    // Extract shipment information from webhook
    const shipmentId = webhookData.data?.shipment_id || webhookData.shipment_id;
    const status = webhookData.data?.status || webhookData.status;
    const tracking = webhookData.data?.tracking || {};
    const location = webhookData.data?.location || tracking.location;

    if (!shipmentId) {
      console.error('No shipment_id in webhook data');
      return new Response(
        JSON.stringify({ error: 'Missing shipment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing webhook for shipment:', shipmentId, 'Status:', status);

    // Find delivery request by provider_order_id (shipment_id)
    const { data: deliveryRequest, error: fetchError } = await supabase
      .from('delivery_requests')
      .select('*, repair_jobs(*)')
      .eq('provider_order_id', shipmentId)
      .single();

    if (fetchError || !deliveryRequest) {
      console.error('Delivery request not found:', shipmentId);
      return new Response(
        JSON.stringify({ error: 'Delivery request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found delivery request:', deliveryRequest.id);

    // Map Terminal Africa status to our internal status
    const internalStatus = statusMap[status] || 'pending';
    
    // Prepare update data
    const updateData: any = {
      delivery_status: internalStatus,
      updated_at: new Date().toISOString(),
    };

    // Update driver info if available
    if (webhookData.data?.driver || tracking.driver) {
      const driver = webhookData.data?.driver || tracking.driver;
      updateData.driver_name = driver.name;
      updateData.driver_phone = driver.phone;
    }

    // Update pickup/delivery times
    if (status === 'picked-up' && !deliveryRequest.actual_pickup_time) {
      updateData.actual_pickup_time = new Date().toISOString();
    }
    
    if (status === 'delivered' && !deliveryRequest.actual_delivery_time) {
      updateData.actual_delivery_time = new Date().toISOString();
      
      // Mark cash payment as pending confirmation on delivery
      if (deliveryRequest.cash_payment_status === 'pending') {
        updateData.cash_payment_status = 'awaiting_confirmation';
      }
    }

    // Update delivery request
    const { error: updateError } = await supabase
      .from('delivery_requests')
      .update(updateData)
      .eq('id', deliveryRequest.id);

    if (updateError) {
      console.error('Failed to update delivery request:', updateError);
      throw updateError;
    }

    console.log('Updated delivery request status to:', internalStatus);

    // Insert status history
    await supabase
      .from('delivery_status_history')
      .insert({
        delivery_request_id: deliveryRequest.id,
        status: internalStatus,
        location: location ? JSON.stringify(location) : null,
        notes: `Status updated by Terminal Africa: ${status}`,
      });

    // Update repair job status if needed
    if (deliveryRequest.repair_job_id) {
      const job = deliveryRequest.repair_jobs;
      
      if (deliveryRequest.delivery_type === 'pickup' && job.job_status === 'quote_accepted') {
        const { error: jobUpdateError } = await supabase
          .from('repair_jobs')
          .update({ job_status: 'pickup_scheduled' })
          .eq('id', deliveryRequest.repair_job_id);
        
        if (jobUpdateError) {
          console.error('Failed to update job status:', jobUpdateError);
        } else {
          console.log('Updated job status to pickup_scheduled');
        }
      } else if (deliveryRequest.delivery_type === 'return' && job.job_status === 'repair_completed') {
        const { error: jobUpdateError } = await supabase
          .from('repair_jobs')
          .update({ job_status: 'ready_for_return' })
          .eq('id', deliveryRequest.repair_job_id);
        
        if (jobUpdateError) {
          console.error('Failed to update job status:', jobUpdateError);
        } else {
          console.log('Updated job status to ready_for_return');
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        delivery_status: internalStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Terminal Africa webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
