// Shared repair-centre ranking used by diagnosis recommendations and the
// response-clock sweep, so both sides always agree on "next best centre".

const DEVICE_KEYWORDS: Record<string, string[]> = {
  smartphone: ['phone', 'smartphone', 'mobile', 'iphone', 'android', 'screen', 'battery'],
  tv: ['tv', 'television', 'display', 'panel'],
  monitor: ['monitor', 'display', 'screen', 'pc'],
  headphones: ['headphone', 'audio', 'speaker', 'earbud'],
  laptop: ['laptop', 'computer', 'pc', 'notebook'],
};

export interface RankedCenter {
  id: number;
  name: string;
  general_location: string;
  hours: string | null;
  specialties: string | null;
  number_of_staff: number | null;
  years_of_experience: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  logo_url: string | null;
  match_score: number;
  reason: string;
  is_online: boolean;
}

export interface RankOptions {
  applianceType?: string;
  diagnosis?: string;
  area?: string;
  limit?: number;
  onlineOnly?: boolean;
  exclude?: number[];
  onlineWindowMinutes?: number;
}

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export async function rankCenters(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  opts: RankOptions,
): Promise<RankedCenter[]> {
  const applianceType = (opts.applianceType || '').toString();
  const diagnosis = (opts.diagnosis || '').toString();
  const area = (opts.area || '').toString();
  const limit = Math.min(Math.max(Number(opts.limit) || 3, 1), 10);
  const exclude = new Set((opts.exclude || []).map((id) => Number(id)));
  const onlineWindowMinutes = Number(opts.onlineWindowMinutes) || 15;

  const { data: centers, error } = await supabase
    .from('Repair Center')
    .select(
      'id, name, address, hours, specialties, number_of_staff, years_of_experience, average_rating, total_reviews, logo_url',
    )
    .eq('status', 'active')
    .is('deleted_at', null);

  if (error) throw error;

  const cutoff = new Date(Date.now() - onlineWindowMinutes * 60000).toISOString();
  const { data: activity } = await supabase
    .from('center_activity')
    .select('repair_center_id, last_seen_at')
    .gte('last_seen_at', cutoff);
  const onlineIds = new Set((activity || []).map((a: { repair_center_id: number }) => Number(a.repair_center_id)));

  const areaTokens = tokenize(area);
  const faultTokens = tokenize(diagnosis);
  const deviceTokens = [
    ...tokenize(applianceType),
    ...(DEVICE_KEYWORDS[applianceType.toLowerCase()] || []),
  ];

  // deno-lint-ignore no-explicit-any
  const scored: RankedCenter[] = (centers || [])
    .filter((c: any) => !exclude.has(Number(c.id)))
    .filter((c: any) => (opts.onlineOnly ? onlineIds.has(Number(c.id)) : true))
    .map((c: any) => {
      const addressLower = (c.address || '').toLowerCase();
      const specialtiesLower = (c.specialties || '').toLowerCase();

      const areaMatches = areaTokens.filter((t) => addressLower.includes(t));
      const deviceMatches = deviceTokens.filter((t) => specialtiesLower.includes(t));
      const faultMatches = faultTokens.filter((t) => specialtiesLower.includes(t));
      const isOnline = onlineIds.has(Number(c.id));

      const score =
        areaMatches.length * 40 +
        deviceMatches.length * 15 +
        faultMatches.length * 5 +
        (isOnline ? 25 : 0) +
        Number(c.average_rating || 0) * 6 +
        Math.min(Number(c.years_of_experience || 0), 15) * 0.8 +
        Math.min(Number(c.total_reviews || 0), 50) * 0.2;

      const reasons: string[] = [];
      if (areaMatches.length) reasons.push('close to your area');
      if (isOnline) reasons.push('online now');
      if (deviceMatches.length) reasons.push(`specialises in ${applianceType || 'this device'} repairs`);
      if (Number(c.average_rating || 0) >= 4) reasons.push(`rated ${Number(c.average_rating).toFixed(1)}/5`);
      if (!reasons.length && Number(c.years_of_experience || 0) > 0) {
        reasons.push(`${c.years_of_experience} years of experience`);
      }
      if (!reasons.length) reasons.push('active FixBudi partner');

      // Coarse area label only — the full street address stays private until a job exists.
      const generalLocation = c.address
        ? c.address.includes(',')
          ? c.address.split(',').slice(1).join(',').trim()
          : 'Location available'
        : 'Location available';

      return {
        id: Number(c.id),
        name: c.name,
        general_location: generalLocation,
        hours: c.hours ?? null,
        specialties: c.specialties ?? null,
        number_of_staff: c.number_of_staff ?? null,
        years_of_experience: c.years_of_experience ?? null,
        average_rating: c.average_rating ?? null,
        total_reviews: c.total_reviews ?? null,
        logo_url: c.logo_url ?? null,
        match_score: Math.round(score),
        reason: reasons.slice(0, 2).join(' · '),
        is_online: isOnline,
      };
    });

  scored.sort((a, b) => b.match_score - a.match_score);
  return scored.slice(0, limit);
}
