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
    const sendstackApiKey = Deno.env.get('SENDSTACK_API_KEY')!;
    
    const { pickup_address, delivery_address, vehicle_type, package_size }: QuoteRequest = await req.json();

    console.log('Getting SendStack quote:', { pickup_address, delivery_address, vehicle_type });

    // Validate Nigerian addresses (SendStack only operates in Nigeria)
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

    // Get quote from SendStack
    const quotePayload = {
      pickup_address,
      delivery_address,
      vehicle_type: vehicle_type || 'bike',
      package_size: package_size || 'medium',
    };

    const response = await fetch('https://api.sendstack.africa/v1/quotes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendstackApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quotePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendStack API error:', errorText);
      throw new Error(`SendStack API error: ${response.status}`);
    }

    const quoteData = await response.json();
    console.log('SendStack quote response:', quoteData);

    const estimatedCost = quoteData.price || quoteData.estimated_cost || 0;
    const appCommission = estimatedCost * 0.05; // 5% commission
    const currency = quoteData.currency || 'NGN';

    return new Response(
      JSON.stringify({
        success: true,
        quote: {
          provider: 'sendstack',
          estimated_cost: estimatedCost,
          currency: currency,
          estimated_time_minutes: quoteData.estimated_duration_minutes || 60,
          vehicle_type: vehicle_type || 'bike',
          distance_km: quoteData.distance_km,
          app_commission: appCommission,
          total_customer_pays: estimatedCost, // Customer pays full amount to rider
          commission_rate: 0.05,
          quote_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting SendStack quote:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
