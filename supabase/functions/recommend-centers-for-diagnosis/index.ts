import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEVICE_KEYWORDS: Record<string, string[]> = {
  smartphone: ['phone', 'smartphone', 'mobile', 'iphone', 'android', 'screen', 'battery'],
  tv: ['tv', 'television', 'display', 'panel'],
  monitor: ['monitor', 'display', 'screen', 'pc'],
  headphones: ['headphone', 'audio', 'speaker', 'earbud'],
  laptop: ['laptop', 'computer', 'pc', 'notebook'],
};

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const applianceType: string = (body.applianceType || '').toString().slice(0, 60);
    const diagnosis: string = (body.diagnosis || '').toString().slice(0, 3000);
    const area: string = (body.area || '').toString().slice(0, 120);
    const limit = Math.min(Math.max(Number(body.limit) || 3, 1), 6);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: centers, error } = await supabase
      .from('Repair Center')
      .select('id, name, address, hours, specialties, number_of_staff, years_of_experience, average_rating, total_reviews, logo_url')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (error) throw error;

    const areaTokens = tokenize(area);
    const faultTokens = tokenize(diagnosis);
    const deviceTokens = [
      ...tokenize(applianceType),
      ...(DEVICE_KEYWORDS[applianceType?.toLowerCase()] || []),
    ];

    const scored = (centers || []).map((c: any) => {
      const addressLower = (c.address || '').toLowerCase();
      const specialtiesLower = (c.specialties || '').toLowerCase();

      const areaMatches = areaTokens.filter((t) => addressLower.includes(t));
      const deviceMatches = deviceTokens.filter((t) => specialtiesLower.includes(t));
      const faultMatches = faultTokens.filter((t) => specialtiesLower.includes(t));

      const score =
        areaMatches.length * 40 +
        deviceMatches.length * 15 +
        faultMatches.length * 5 +
        Number(c.average_rating || 0) * 6 +
        Math.min(Number(c.years_of_experience || 0), 15) * 0.8 +
        Math.min(Number(c.total_reviews || 0), 50) * 0.2;

      const reasons: string[] = [];
      if (areaMatches.length) reasons.push('close to your area');
      if (deviceMatches.length) reasons.push(`specialises in ${applianceType || 'this device'} repairs`);
      if (Number(c.average_rating || 0) >= 4) reasons.push(`rated ${Number(c.average_rating).toFixed(1)}/5`);
      if (!reasons.length && Number(c.years_of_experience || 0) > 0) {
        reasons.push(`${c.years_of_experience} years of experience`);
      }
      if (!reasons.length) reasons.push('active FixBudi partner');

      // Coarse area label only — the full street address stays private until a job exists.
      const generalLocation = c.address
        ? (c.address.includes(',') ? c.address.split(',').slice(1).join(',').trim() : 'Location available')
        : 'Location available';

      return {
        id: c.id,
        name: c.name,
        general_location: generalLocation,
        hours: c.hours,
        specialties: c.specialties,
        number_of_staff: c.number_of_staff,
        years_of_experience: c.years_of_experience,
        average_rating: c.average_rating,
        total_reviews: c.total_reviews,
        logo_url: c.logo_url,
        match_score: Math.round(score),
        reason: reasons.slice(0, 2).join(' · '),
      };
    });

    scored.sort((a, b) => b.match_score - a.match_score);

    return new Response(JSON.stringify({ centers: scored.slice(0, limit) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('recommend-centers-for-diagnosis error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to recommend centers' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
