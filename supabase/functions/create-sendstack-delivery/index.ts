import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryRequest {
  repair_job_id: string;
  delivery_type: 'pickup' | 'return';
  scheduled_pickup_time?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sendstackApiKey = Deno.env.get('SENDSTACK_API_KEY')!;
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { repair_job_id, delivery_type, scheduled_pickup_time, notes }: DeliveryRequest = await req.json();

    console.log('Creating SendStack delivery:', { repair_job_id, delivery_type });

    // Get repair job details
    const { data: job, error: jobError } = await supabase
      .from('repair_jobs')
      .select(`
        *,
        repair_center:Repair Center!repair_center_id (
          id,
          name,
          address,
          phone
        )
      `)
      .eq('id', repair_job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Repair job not found');
    }

    // Check user has permission (customer or staff)
    const isCustomer = job.user_id === user.id;
    const { data: isStaff } = await supabase.rpc('is_staff_at_center', {
      _user_id: user.id,
      _center_id: job.repair_center_id
    });

    if (!isCustomer && !isStaff) {
      throw new Error('Unauthorized to create delivery for this job');
    }

    // Determine pickup and delivery addresses based on delivery type
    const pickupAddress = delivery_type === 'pickup' 
      ? job.pickup_address 
      : job.repair_center.address;
    
    const deliveryAddress = delivery_type === 'pickup'
      ? job.repair_center.address
      : job.pickup_address;

    // Create SendStack delivery order
    const sendstackPayload = {
      pickup_location: {
        address: pickupAddress,
        contact_name: delivery_type === 'pickup' ? job.customer_name : job.repair_center.name,
        contact_phone: delivery_type === 'pickup' ? job.customer_phone : job.repair_center.phone,
      },
      delivery_location: {
        address: deliveryAddress,
        contact_name: delivery_type === 'pickup' ? job.repair_center.name : job.customer_name,
        contact_phone: delivery_type === 'pickup' ? job.repair_center.phone : job.customer_phone,
      },
      package_details: {
        description: `${job.appliance_type} - ${job.appliance_brand || ''} ${job.appliance_model || ''}`.trim(),
        value: job.estimated_cost || 0,
        size: 'medium',
      },
      scheduled_time: scheduled_pickup_time || new Date().toISOString(),
      notes: notes || `Repair job: ${delivery_type}`,
    };

    console.log('SendStack API payload:', sendstackPayload);

    const sendstackResponse = await fetch('https://api.sendstack.africa/v1/deliveries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendstackApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendstackPayload),
    });

    if (!sendstackResponse.ok) {
      const errorText = await sendstackResponse.text();
      console.error('SendStack API error:', errorText);
      throw new Error(`SendStack API error: ${sendstackResponse.status} - ${errorText}`);
    }

    const sendstackData = await sendstackResponse.json();
    console.log('SendStack response:', sendstackData);

    // Store delivery request in database
    const { data: deliveryRequest, error: insertError } = await supabase
      .from('delivery_requests')
      .insert({
        repair_job_id,
        delivery_type,
        provider: 'sendstack',
        customer_name: job.customer_name,
        customer_phone: job.customer_phone,
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        estimated_cost: sendstackData.estimated_cost || sendstackData.price,
        delivery_status: 'pending',
        provider_order_id: sendstackData.id || sendstackData.delivery_id,
        tracking_url: sendstackData.tracking_url,
        scheduled_pickup_time: scheduled_pickup_time || new Date().toISOString(),
        provider_response: sendstackData,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save delivery request');
    }

    // Insert initial status history
    await supabase
      .from('delivery_status_history')
      .insert({
        delivery_request_id: deliveryRequest.id,
        status: 'pending',
        notes: 'Delivery request created',
      });

    return new Response(
      JSON.stringify({
        success: true,
        delivery_request_id: deliveryRequest.id,
        provider_order_id: sendstackData.id || sendstackData.delivery_id,
        tracking_url: sendstackData.tracking_url,
        estimated_cost: sendstackData.estimated_cost || sendstackData.price,
        estimated_delivery_time: sendstackData.estimated_delivery_time,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating SendStack delivery:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
