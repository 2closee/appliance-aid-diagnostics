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
    const terminalApiKey = Deno.env.get('TERMINAL_AFRICA_API_KEY')!;
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { repair_job_id, delivery_type, scheduled_pickup_time, notes }: DeliveryRequest = await req.json();

    console.log('Creating Terminal Africa delivery:', { repair_job_id, delivery_type });

    // Get repair job details
    const { data: job, error: jobError } = await supabase
      .from('repair_jobs')
      .select(`
        *,
        repair_centers:repair_center_id (
          id,
          name,
          address,
          phone,
          email
        )
      `)
      .eq('id', repair_job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Repair job not found');
    }

    // Check authorization
    const isCustomer = job.user_id === user.id;
    const { data: isStaff } = await supabase.rpc('is_staff_at_center', {
      _user_id: user.id,
      _center_id: job.repair_center_id
    });

    if (!isCustomer && !isStaff) {
      throw new Error('Unauthorized to create delivery for this job');
    }

    const repairCenter = job.repair_centers;
    
    // Determine addresses based on delivery type
    const pickupAddress = delivery_type === 'pickup' ? job.pickup_address : repairCenter.address;
    const deliveryAddress = delivery_type === 'pickup' ? repairCenter.address : job.pickup_address;
    const pickupName = delivery_type === 'pickup' ? job.customer_name : repairCenter.name;
    const pickupPhone = delivery_type === 'pickup' ? job.customer_phone : repairCenter.phone;
    const deliveryName = delivery_type === 'pickup' ? repairCenter.name : job.customer_name;
    const deliveryPhone = delivery_type === 'pickup' ? repairCenter.phone : job.customer_phone;

    console.log('Delivery details:', {
      type: delivery_type,
      from: pickupAddress,
      to: deliveryAddress,
    });

    // Create shipment on Terminal Africa
    const shipmentPayload = {
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      pickup_name: pickupName,
      pickup_phone: pickupPhone,
      delivery_name: deliveryName,
      delivery_phone: deliveryPhone,
      parcel_items: [{
        weight: 10,
        type: 'electronics',
        description: `${job.appliance_type} - ${job.appliance_brand || 'Appliance'}`,
        value: job.quoted_cost || 0,
      }],
      metadata: {
        repair_job_id,
        delivery_type,
        customer_email: job.customer_email,
      },
    };

    console.log('Terminal Africa shipment payload:', JSON.stringify(shipmentPayload, null, 2));

    const shipmentResponse = await fetch('https://api.terminal.africa/v1/shipments/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentPayload),
    });

    if (!shipmentResponse.ok) {
      const errorText = await shipmentResponse.text();
      console.error('Terminal Africa shipment error:', errorText);
      
      let errorMessage = `Terminal Africa API error (${shipmentResponse.status})`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const shipmentData = await shipmentResponse.json();
    const shipmentId = shipmentData.data?.shipment_id || shipmentData.shipment_id;
    
    console.log('Shipment created:', shipmentId);

    // Get quotes for the shipment
    const quotesResponse = await fetch('https://api.terminal.africa/v1/rates/shipment/quotes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment_id: shipmentId }),
    });

    if (!quotesResponse.ok) {
      const errorText = await quotesResponse.text();
      console.error('Terminal Africa quotes error:', errorText);
      throw new Error(`Failed to get quotes: ${quotesResponse.status}`);
    }

    const quotesData = await quotesResponse.json();
    const quotes = quotesData.data || [];
    
    if (!quotes.length) {
      throw new Error('No quotes available for this route');
    }

    // Get best quote (cheapest)
    const bestQuote = quotes.reduce((prev: any, curr: any) => 
      (curr.amount < prev.amount) ? curr : prev
    );

    console.log('Selected quote:', bestQuote);

    // Arrange pickup with Terminal Africa
    const pickupDate = scheduled_pickup_time || new Date().toISOString().split('T')[0];
    
    const arrangePayload = {
      shipment_id: shipmentId,
      rate_id: bestQuote.rate_id,
      pickup_date: pickupDate,
    };

    console.log('Arranging pickup:', arrangePayload);

    const arrangeResponse = await fetch(`https://api.terminal.africa/v1/shipments/${shipmentId}/arrange`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(arrangePayload),
    });

    if (!arrangeResponse.ok) {
      const errorText = await arrangeResponse.text();
      console.error('Terminal Africa arrange error:', errorText);
      throw new Error(`Failed to arrange pickup: ${arrangeResponse.status}`);
    }

    const arrangeData = await arrangeResponse.json();
    console.log('Pickup arranged:', arrangeData);

    const estimatedCost = bestQuote.amount;
    const appCommission = estimatedCost * 0.05;
    const trackingUrl = arrangeData.data?.tracking_url || `https://terminal.africa/track/${shipmentId}`;

    // Save to database
    const { data: deliveryRequest, error: insertError } = await supabase
      .from('delivery_requests')
      .insert({
        repair_job_id,
        delivery_type,
        provider: 'terminal_africa',
        provider_order_id: shipmentId,
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        customer_name: job.customer_name,
        customer_phone: job.customer_phone,
        estimated_cost: estimatedCost,
        actual_cost: estimatedCost,
        app_delivery_commission: appCommission,
        currency: bestQuote.currency || 'NGN',
        delivery_status: 'pending',
        scheduled_pickup_time: pickupDate,
        estimated_delivery_time: new Date(Date.now() + (bestQuote.duration || 60) * 60 * 1000).toISOString(),
        tracking_url: trackingUrl,
        vehicle_details: bestQuote.carrier?.name || 'Terminal Africa',
        provider_response: arrangeData,
        notes: notes || `${delivery_type} delivery for ${job.appliance_type}`,
        cash_payment_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    // Insert status history
    await supabase
      .from('delivery_status_history')
      .insert({
        delivery_request_id: deliveryRequest.id,
        status: 'pending',
        notes: 'Delivery scheduled with Terminal Africa',
      });

    // Create commission record
    if (estimatedCost > 0) {
      await supabase
        .from('delivery_commissions')
        .insert({
          delivery_request_id: deliveryRequest.id,
          repair_job_id,
          delivery_cost: estimatedCost,
          commission_amount: appCommission,
          commission_rate: 0.05,
          status: 'pending',
        });
    }

    console.log('Delivery request created successfully:', deliveryRequest.id);

    return new Response(
      JSON.stringify({
        success: true,
        delivery: deliveryRequest,
        message: `${delivery_type === 'pickup' ? 'Pickup' : 'Return'} delivery scheduled successfully`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Terminal Africa delivery:', error);
    
    let userMessage = error.message;
    if (error.message.includes('Unauthorized')) {
      userMessage = 'You are not authorized to create this delivery.';
    } else if (error.message.includes('not found')) {
      userMessage = 'Repair job not found or has been removed.';
    } else if (error.message.includes('Terminal Africa')) {
      userMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
