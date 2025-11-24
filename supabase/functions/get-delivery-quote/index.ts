import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  pickup_address: string;
  delivery_address: string;
  pickup_name?: string;
  pickup_phone?: string;
  delivery_name?: string;
  delivery_phone?: string;
  package_size?: 'small' | 'medium' | 'large';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const terminalApiKey = Deno.env.get('TERMINAL_AFRICA_API_KEY')!;
    
    const { 
      pickup_address, 
      delivery_address, 
      pickup_name = 'Customer',
      pickup_phone = '+2348000000000',
      delivery_name = 'Repair Center',
      delivery_phone = '+2348000000000',
      package_size = 'medium'
    }: QuoteRequest = await req.json();

    console.log('Getting Terminal Africa quote:', { pickup_address, delivery_address, package_size });

    // Validate Nigerian addresses
    const isNigerianAddress = (address: string): boolean => {
      const nigerianKeywords = ['nigeria', 'lagos', 'abuja', 'kano', 'ibadan', 'port harcourt', 'benin city', 'kaduna', 'jos', 'ilorin', 'oyo', 'enugu', 'abeokuta', 'ng'];
      return nigerianKeywords.some(keyword => address.toLowerCase().includes(keyword));
    };

    if (!isNigerianAddress(pickup_address) || !isNigerianAddress(delivery_address)) {
      console.log('Address validation failed: Not in Nigeria service area');
      return new Response(
        JSON.stringify({ 
          error: 'Delivery service is only available within Nigeria',
          service_area_restriction: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create pickup address
    console.log('Step 1: Creating pickup address');
    const pickupAddressResponse = await fetch('https://api.terminal.africa/v1/addresses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: pickup_name,
        phone: pickup_phone,
        line1: pickup_address,
        country: 'NG'
      }),
    });

    if (!pickupAddressResponse.ok) {
      const errorText = await pickupAddressResponse.text();
      console.error('Pickup address creation failed:', errorText);
      throw new Error(`Failed to create pickup address: ${pickupAddressResponse.status}`);
    }

    const pickupAddressData = await pickupAddressResponse.json();
    const addressFromId = pickupAddressData.data?.address_id || pickupAddressData.address_id;

    // Step 2: Create delivery address
    console.log('Step 2: Creating delivery address');
    const deliveryAddressResponse = await fetch('https://api.terminal.africa/v1/addresses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: delivery_name,
        phone: delivery_phone,
        line1: delivery_address,
        country: 'NG'
      }),
    });

    if (!deliveryAddressResponse.ok) {
      const errorText = await deliveryAddressResponse.text();
      console.error('Delivery address creation failed:', errorText);
      throw new Error(`Failed to create delivery address: ${deliveryAddressResponse.status}`);
    }

    const deliveryAddressData = await deliveryAddressResponse.json();
    const addressToId = deliveryAddressData.data?.address_id || deliveryAddressData.address_id;

    // Step 3: Create parcel
    console.log('Step 3: Creating parcel');
    const weight = package_size === 'large' ? 15 : package_size === 'medium' ? 10 : 5;
    
    const parcelResponse = await fetch('https://api.terminal.africa/v1/parcels', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Appliance for repair',
        items: [{
          name: 'Electronics',
          description: 'Appliance for repair',
          weight: weight,
          quantity: 1,
          type: 'electronics',
          value: 10000
        }],
        weight: weight,
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

    // Step 4: Create shipment
    console.log('Step 4: Creating shipment');
    const shipmentResponse = await fetch('https://api.terminal.africa/v1/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_from: addressFromId,
        address_to: addressToId,
        parcel: parcelId
      }),
    });

    if (!shipmentResponse.ok) {
      const errorText = await shipmentResponse.text();
      console.error('Shipment creation failed:', errorText);
      throw new Error(`Failed to create shipment: ${shipmentResponse.status}`);
    }

    const shipmentData = await shipmentResponse.json();
    const shipmentId = shipmentData.data?.shipment_id || shipmentData.shipment_id;

    // Step 5: Get rates
    console.log('Step 5: Getting rates');
    const ratesResponse = await fetch('https://api.terminal.africa/v1/rates/shipment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${terminalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipment_id: shipmentId
      }),
    });

    if (!ratesResponse.ok) {
      const errorText = await ratesResponse.text();
      console.error('Rates fetch failed:', errorText);
      throw new Error(`Failed to get rates: ${ratesResponse.status}`);
    }

    const ratesData = await ratesResponse.json();
    console.log('Terminal Africa rates response:', JSON.stringify(ratesData, null, 2));

    // Get the rates array
    const rates = ratesData.data || [];
    if (!rates.length) {
      throw new Error('No carriers available for this route');
    }

    // Select best (cheapest) rate
    const bestRate = rates.reduce((prev: any, curr: any) => 
      (curr.amount < prev.amount) ? curr : prev
    );

    const estimatedCost = bestRate.amount || 0;
    const appCommission = estimatedCost * 0.05;
    const currency = bestRate.currency || 'NGN';

    return new Response(
      JSON.stringify({
        success: true,
        quote: {
          provider: 'terminal_africa',
          carrier: bestRate.carrier?.name || 'Terminal Africa',
          estimated_cost: estimatedCost,
          currency: currency,
          estimated_time_minutes: bestRate.duration || 60,
          distance_km: bestRate.distance,
          app_commission: appCommission,
          total_customer_pays: estimatedCost,
          commission_rate: 0.05,
          quote_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          shipment_id: shipmentId,
          rate_id: bestRate.rate_id,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting Terminal Africa quote:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
