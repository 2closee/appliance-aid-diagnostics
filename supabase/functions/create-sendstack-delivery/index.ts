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
    
    // Parse SendStack credentials (format: app_id:app_secret)
    const [sendstackAppId, sendstackAppSecret] = sendstackApiKey.split(':');
    if (!sendstackAppId || !sendstackAppSecret) {
      throw new Error('SENDSTACK_API_KEY must be in format: app_id:app_secret');
    }
    
    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header for permission checks
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    const { repair_job_id, delivery_type, scheduled_pickup_time, notes }: DeliveryRequest = await req.json();

    console.log('Creating SendStack delivery:', { repair_job_id, delivery_type });

    // Get repair job details
    console.log('Querying repair job:', repair_job_id);
    const { data: job, error: jobError } = await supabase
      .from('repair_jobs')
      .select(`
        *,
        repair_center:"Repair Center"!repair_center_id (
          id,
          name,
          address,
          phone
        )
      `)
      .eq('id', repair_job_id)
      .single();

    if (jobError) {
      console.error('Job query error:', jobError);
      throw new Error(`Repair job not found: ${jobError.message}`);
    }

    if (!job) {
      console.error('No job data returned for id:', repair_job_id);
      throw new Error('Repair job not found');
    }

    console.log('Job found:', { id: job.id, repair_center_id: job.repair_center_id, has_repair_center: !!job.repair_center });

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

    // Format pickup date as YYYY-MM-DD
    const pickupDate = scheduled_pickup_time 
      ? new Date(scheduled_pickup_time).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Create SendStack delivery order (correct format)
    const sendstackPayload = {
      orderType: 'PROCESSING',
      bookingName: job.customer_name,
      bookingPhone: job.customer_phone,
      bookingEmail: job.customer_email,
      pickup: {
        address: pickupAddress,
        pickupName: delivery_type === 'pickup' ? job.customer_name : job.repair_center.name,
        pickupNumber: delivery_type === 'pickup' ? job.customer_phone : job.repair_center.phone,
        pickupDate: pickupDate,
      },
      drops: [
        {
          address: deliveryAddress,
          recipientName: delivery_type === 'pickup' ? job.repair_center.name : job.customer_name,
          recipientNumber: delivery_type === 'pickup' ? job.repair_center.phone : job.customer_phone,
          itemDescription: `${job.appliance_type} - ${job.appliance_brand || ''} ${job.appliance_model || ''}`.trim(),
          notes: notes || `${delivery_type === 'pickup' ? 'Pickup' : 'Return'} delivery for ${job.appliance_type} repair`,
        }
      ],
    };

    console.log('SendStack API payload:', JSON.stringify(sendstackPayload, null, 2));

    // Create delivery with SendStack
    const sendstackResponse = await fetch('https://api.sendstack.africa/api/v1/deliveries', {
      method: 'POST',
      headers: {
        'app_id': sendstackAppId,
        'app_secret': sendstackAppSecret,
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
    console.log('SendStack response:', JSON.stringify(sendstackData, null, 2));

    // Extract cost information from response
    const estimatedCost = sendstackData.totalAmount || 0;
    const appCommission = estimatedCost * 0.05; // 5% commission

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
        estimated_cost: estimatedCost,
        app_delivery_commission: appCommission,
        currency: 'NGN',
        cash_payment_status: 'pending',
        delivery_status: 'pending',
        provider_order_id: sendstackData.id || sendstackData.batchId,
        tracking_url: sendstackData.trackingUrl,
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

    // Create commission record
    if (estimatedCost > 0) {
      const { error: commissionError } = await supabase
        .from('delivery_commissions')
        .insert({
          delivery_request_id: deliveryRequest.id,
          repair_job_id: repair_job_id,
          delivery_cost: estimatedCost,
          commission_amount: appCommission,
          commission_rate: 0.05,
          status: 'pending',
        });
      
      if (commissionError) {
        console.error('Failed to create commission record:', commissionError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        delivery_request_id: deliveryRequest.id,
        provider_order_id: sendstackData.id || sendstackData.batchId,
        tracking_url: sendstackData.trackingUrl,
        estimated_cost: estimatedCost,
        app_commission: appCommission,
        currency: 'NGN',
        payment_method: 'cash_to_rider',
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
