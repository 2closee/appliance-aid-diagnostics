import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, city, state, zipCode } = await req.json();

    if (!address || !city) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Address and city are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    if (!mapboxToken) {
      console.error('MAPBOX_PUBLIC_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Geocoding service not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Construct full address for geocoding
    const fullAddress = `${address}, ${city}${state ? ', ' + state : ''}${zipCode ? ' ' + zipCode : ''}`;
    console.log('Verifying address:', fullAddress);

    // Use Mapbox Geocoding API
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=5&types=address`;
    
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      console.error('Mapbox API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Failed to verify address' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('Geocoding results:', data.features?.length || 0, 'matches found');

    if (!data.features || data.features.length === 0) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Address not found. Please check the address and try again.',
          suggestions: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the best match and suggestions
    const bestMatch = data.features[0];
    const suggestions = data.features.slice(0, 3).map((feature: any) => ({
      address: feature.place_name,
      coordinates: feature.center
    }));

    // Calculate relevance score based on text similarity
    const relevance = bestMatch.relevance || 0;
    
    return new Response(
      JSON.stringify({ 
        valid: relevance >= 0.8, // Consider valid if relevance is 80% or higher
        confidence: relevance,
        verified_address: bestMatch.place_name,
        coordinates: bestMatch.center,
        suggestions: suggestions,
        message: relevance >= 0.8 
          ? 'Address verified successfully' 
          : 'Address found but may not be exact. Please verify.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-address function:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error.message || 'Failed to verify address' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
