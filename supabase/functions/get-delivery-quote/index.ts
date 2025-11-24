import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  pickup_address: string;
  delivery_address: string;
  vehicle_type?: 'bike' | 'car' | 'van';
  package_size?: 'small' | 'medium' | 'large';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const terminalApiKey = Deno.env.get('TERMINAL_AFRICA_API_KEY')!;
    
    const { pickup_address, delivery_address, vehicle_type, package_size }: QuoteRequest = await req.json();

    console.log('Getting Terminal Africa quote:', { pickup_address, delivery_address, vehicle_type });

    // Validate Nigerian addresses (Terminal Africa operates in Nigeria)
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

    // Create temporary shipment to get quotes
    const shipmentPayload = {
      pickup_address,
      delivery_address,
      parcel_items: [{
        weight: package_size === 'large' ? 15 : package_size === 'medium' ? 10 : 5,
        type: 'electronics',
        description: 'Appliance for repair',
      }],
    };

    console.log('Terminal Africa shipment payload:', JSON.stringify(shipmentPayload, null, 2));

    // Create shipment
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
      throw new Error(`Terminal Africa API error: ${shipmentResponse.status}`);
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
    console.log('Terminal Africa quotes response:', JSON.stringify(quotesData, null, 2));

    // Get the best quote (cheapest)
    const quotes = quotesData.data || [];
    if (!quotes.length) {
      throw new Error('No quotes available for this route');
    }

    const bestQuote = quotes.reduce((prev: any, curr: any) => 
      (curr.amount < prev.amount) ? curr : prev
    );

    const estimatedCost = bestQuote.amount || 0;
    const appCommission = estimatedCost * 0.05; // 5% commission
    const currency = bestQuote.currency || 'NGN';

    return new Response(
      JSON.stringify({
        success: true,
        quote: {
          provider: 'terminal_africa',
          carrier: bestQuote.carrier?.name || 'Terminal Africa',
          estimated_cost: estimatedCost,
          currency: currency,
          estimated_time_minutes: bestQuote.duration || 60,
          vehicle_type: vehicle_type || 'bike',
          distance_km: bestQuote.distance,
          app_commission: appCommission,
          total_customer_pays: estimatedCost,
          commission_rate: 0.05,
          quote_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          shipment_id: shipmentId, // Save for later use
          rate_id: bestQuote.rate_id, // Save for arranging pickup
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
