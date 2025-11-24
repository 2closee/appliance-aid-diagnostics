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
    
    // Helper function to parse Nigerian addresses
    const parseNigerianAddress = (fullAddress: string) => {
      const parts = fullAddress.split(',').map(p => p.trim());
      
      // Look for Port Harcourt or Rivers state in the address
      const addressLower = fullAddress.toLowerCase();
      let city = 'Port Harcourt'; // Default
      let state = 'Rivers'; // Default
      
      // Check if Port Harcourt is mentioned anywhere
      if (addressLower.includes('port harcourt') || addressLower.includes('portharcourt')) {
        city = 'Port Harcourt';
        state = 'Rivers';
      }
      
      // Extract street address (first part)
      const line1 = parts[0] || fullAddress;
      
      return {
        line1,
        city,
        state,
        country: 'NG'
      };
    };

    // Helper function to format phone to international format
    const formatPhoneNumber = (phone: string): string => {
      // Remove all non-numeric characters
      const cleaned = phone.replace(/\D/g, '');
      
      // If starts with 234, return with +
      if (cleaned.startsWith('234')) {
        return `+${cleaned}`;
      }
      
      // If starts with 0, replace with +234
      if (cleaned.startsWith('0')) {
        return `+234${cleaned.substring(1)}`;
      }
      
      // Otherwise assume it's already without country code, add +234
      return `+234${cleaned}`;
    };

    // Determine addresses based on delivery type
    const pickupAddress = delivery_type === 'pickup' ? job.pickup_address : repairCenter.address;
    const deliveryAddress = delivery_type === 'pickup' ? repairCenter.address : job.pickup_address;
    const pickupName = delivery_type === 'pickup' ? job.customer_name : repairCenter.name;
    const pickupPhone = delivery_type === 'pickup' ? job.customer_phone : repairCenter.phone;
    const deliveryName = delivery_type === 'pickup' ? repairCenter.name : job.customer_name;
    const deliveryPhone = delivery_type === 'pickup' ? repairCenter.phone : job.customer_phone;

    const parsedPickupAddress = parseNigerianAddress(pickupAddress);
    const parsedDeliveryAddress = parseNigerianAddress(deliveryAddress);

    console.log('Delivery details:', {
      type: delivery_type,
      from: pickupAddress,
      to: deliveryAddress,
    });

    // Step 1: Create pickup address
    console.log('Step 1: Creating pickup address');
    const pickupAddressResponse = await fetch('https://api.terminal.africa/v1/addresses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: pickupName,
        phone: formatPhoneNumber(pickupPhone),
        line1: parsedPickupAddress.line1,
        city: parsedPickupAddress.city,
        state: parsedPickupAddress.state,
        country: parsedPickupAddress.country
      }),
    });

    if (!pickupAddressResponse.ok) {
      const errorText = await pickupAddressResponse.text();
      console.error('Pickup address creation failed:', errorText);
      throw new Error(`Failed to create pickup address: ${pickupAddressResponse.status}`);
    }

    const pickupAddressData = await pickupAddressResponse.json();
    const addressFromId = pickupAddressData.data?.address_id || pickupAddressData.address_id;
    console.log('Pickup address created:', addressFromId);

    // Step 2: Create delivery address
    console.log('Step 2: Creating delivery address');
    const deliveryAddressResponse = await fetch('https://api.terminal.africa/v1/addresses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: deliveryName,
        phone: formatPhoneNumber(deliveryPhone),
        line1: parsedDeliveryAddress.line1,
        city: parsedDeliveryAddress.city,
        state: parsedDeliveryAddress.state,
        country: parsedDeliveryAddress.country
      }),
    });

    if (!deliveryAddressResponse.ok) {
      const errorText = await deliveryAddressResponse.text();
      console.error('Delivery address creation failed:', errorText);
      throw new Error(`Failed to create delivery address: ${deliveryAddressResponse.status}`);
    }

    const deliveryAddressData = await deliveryAddressResponse.json();
    const addressToId = deliveryAddressData.data?.address_id || deliveryAddressData.address_id;
    console.log('Delivery address created:', addressToId);

    // Step 3: Create parcel
    console.log('Step 3: Creating parcel');
    const weight = 10;
    const parcelResponse = await fetch('https://api.terminal.africa/v1/parcels', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: `${job.appliance_type} for repair`,
        items: [{
          name: job.appliance_type,
          description: `${job.appliance_type} - ${job.appliance_brand || 'Appliance'}`,
          weight: weight,
          weight_unit: 'kg',
          quantity: 1,
          type: 'electronics',
          value: job.quoted_cost || 10000
        }],
        weight: weight,
        weight_unit: 'kg',
        packaging: 'box'
      }),
    });

    if (!parcelResponse.ok) {
      const errorText = await parcelResponse.text();
      console.error('Parcel creation failed:', errorText);
      throw new Error(`Failed to create parcel: ${parcelResponse.status}`);
    }

    const parcelData = await parcelResponse.json();
    const parcelId = parcelData.data?.parcel_id || parcelData.parcel_id;
    console.log('Parcel created:', parcelId);

    // Step 4: Create shipment with IDs
    console.log('Step 4: Creating shipment with address and parcel IDs');
    const shipmentResponse = await fetch('https://api.terminal.africa/v1/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_from: addressFromId,
        address_to: addressToId,
        parcel: parcelId,
        metadata: {
          repair_job_id,
          delivery_type,
          customer_email: job.customer_email,
        }
      }),
    });

    if (!shipmentResponse.ok) {
      const errorText = await shipmentResponse.text();
      console.error('Shipment creation failed:', errorText);
      throw new Error(`Failed to create shipment: ${shipmentResponse.status}`);
    }

    const shipmentData = await shipmentResponse.json();
    const shipmentId = shipmentData.data?.shipment_id || shipmentData.shipment_id;
    console.log('Shipment created:', shipmentId);

    // Step 5: Get rates for the shipment
    console.log('Step 5: Getting rates');
    const quotesResponse = await fetch('https://api.terminal.africa/v1/rates/shipment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment_id: shipmentId }),
    });

    if (!quotesResponse.ok) {
      const errorText = await quotesResponse.text();
      console.error('Rates fetch failed:', errorText);
      throw new Error(`Failed to get rates: ${quotesResponse.status}`);
    }

    const quotesData = await quotesResponse.json();
    console.log('Terminal Africa rates response:', JSON.stringify(quotesData, null, 2));

    // Get the rates array
    const quotes = quotesData.data || [];
    if (!quotes.length) {
      throw new Error('No carriers available for this route');
    }

    // Get best quote (cheapest)
    const bestQuote = quotes.reduce((prev: any, curr: any) => 
      (curr.amount < prev.amount) ? curr : prev
    );

    console.log('Selected best rate:', bestQuote);

    // Step 6: Arrange pickup with Terminal Africa
    const pickupDate = scheduled_pickup_time || new Date().toISOString().split('T')[0];
    
    console.log('Step 6: Arranging pickup for', pickupDate);

    const arrangeResponse = await fetch(`https://api.terminal.africa/v1/shipments/${shipmentId}/arrange`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rate_id: bestQuote.rate_id,
        pickup_date: pickupDate,
      }),
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
