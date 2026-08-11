import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Job statuses that must be closed out before a center can be purged.
const OPEN_JOB_STATUSES = [
  'requested',
  'pickup_scheduled',
  'picked_up',
  'in_repair',
  'repair_completed',
  'ready_for_return',
  'quote_requested',
  'quote_pending_review',
  'quote_accepted',
  'quote_negotiating',
  'cost_adjustment_pending',
  'diagnostics_requested',
  'diagnostics_completed',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authorization required' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: 'Invalid authentication' }, 401);

    const { data: isSuperAdmin, error: roleError } = await caller.rpc('has_role', {
      _user_id: user.id,
      _role: 'super_admin',
    });
    if (roleError) {
      console.error('Role check failed:', roleError);
      return json({ error: 'Could not verify permissions' }, 500);
    }
    if (!isSuperAdmin) return json({ error: 'Super admin access required' }, 403);

    const body = await req.json().catch(() => ({}));
    const centerId = Number(body?.centerId);
    const dryRun = body?.dryRun === true;
    if (!Number.isFinite(centerId)) return json({ error: 'centerId is required' }, 400);

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: center, error: centerFetchError } = await admin
      .from('Repair Center')
      .select('id, name, email, deleted_at, logo_url, cover_image_url')
      .eq('id', centerId)
      .maybeSingle();

    if (centerFetchError) throw centerFetchError;
    if (!center) return json({ error: 'Repair center not found' }, 404);
    if (!center.deleted_at) {
      return json({ error: 'Center must be archived before it can be permanently deleted' }, 400);
    }

    // ---- Collect related ids -------------------------------------------------
    const { data: jobRows } = await admin
      .from('repair_jobs')
      .select('id, status')
      .eq('repair_center_id', centerId);
    const jobIds = (jobRows ?? []).map((j: any) => j.id);

    const openJobs = (jobRows ?? []).filter((j: any) => OPEN_JOB_STATUSES.includes(j.status));

    const { data: payoutRows } = await admin
      .from('repair_center_payouts')
      .select('id, status')
      .eq('repair_center_id', centerId);
    const pendingPayouts = (payoutRows ?? []).filter(
      (p: any) => p.status && !['completed', 'paid', 'cancelled', 'failed'].includes(p.status),
    );

    const { data: convRows } = await admin
      .from('conversations')
      .select('id')
      .eq('repair_center_id', centerId);
    const conversationIds = (convRows ?? []).map((c: any) => c.id);

    let deliveryIds: string[] = [];
    if (jobIds.length) {
      const { data: deliveryRows } = await admin
        .from('delivery_requests')
        .select('id')
        .in('repair_job_id', jobIds);
      deliveryIds = (deliveryRows ?? []).map((d: any) => d.id);
    }

    let warrantyIds: string[] = [];
    if (jobIds.length) {
      const { data: warrantyRows } = await admin
        .from('repair_warranties')
        .select('id')
        .in('repair_job_id', jobIds);
      warrantyIds = (warrantyRows ?? []).map((w: any) => w.id);
    }

    const { data: planRows } = await admin
      .from('repair_protection_plans')
      .select('id')
      .eq('repair_center_id', centerId);
    const planIds = (planRows ?? []).map((p: any) => p.id);

    const { data: claimRows } = await admin
      .from('protection_claims')
      .select('id')
      .eq('repair_center_id', centerId);
    const claimIds = (claimRows ?? []).map((c: any) => c.id);

    const { data: referralRows } = await admin
      .from('center_referrals')
      .select('id')
      .or(`referring_center_id.eq.${centerId},referred_center_id.eq.${centerId}`);
    const referralIds = (referralRows ?? []).map((r: any) => r.id);

    if (openJobs.length || pendingPayouts.length) {
      return json({
        error: 'blocked',
        reason: 'open_records',
        openJobs: openJobs.length,
        pendingPayouts: pendingPayouts.length,
        message:
          'This center still has jobs in progress or unsettled payouts. Close them out before deleting permanently.',
      }, 409);
    }

    const counts: Record<string, number> = {
      repair_jobs: jobIds.length,
      conversations: conversationIds.length,
      delivery_requests: deliveryIds.length,
      repair_warranties: warrantyIds.length,
      repair_protection_plans: planIds.length,
      protection_claims: claimIds.length,
      repair_center_payouts: (payoutRows ?? []).length,
      center_referrals: referralIds.length,
    };

    if (dryRun) {
      return json({ success: true, dryRun: true, center: { id: center.id, name: center.name }, counts });
    }

    // ---- Delete in FK-safe order --------------------------------------------
    const del = async (table: string, column: string, values: (string | number)[] | string | number) => {
      if (Array.isArray(values)) {
        if (!values.length) return;
        const { error } = await admin.from(table).delete().in(column, values as any);
        if (error) console.error(`Delete ${table} failed:`, error.message);
        return;
      }
      const { error } = await admin.from(table).delete().eq(column, values as any);
      if (error) console.error(`Delete ${table} failed:`, error.message);
    };

    // Protection
    await del('protection_ledger', 'plan_id', planIds);
    await del('protection_ledger', 'claim_id', claimIds);
    await del('protection_claims', 'repair_center_id', centerId);
    await del('repair_protection_plans', 'repair_center_id', centerId);

    // Warranties
    await del('warranty_claims', 'warranty_id', warrantyIds);
    await del('warranty_claims', 'repair_job_id', jobIds);
    await del('repair_warranties', 'repair_job_id', jobIds);

    // Logistics / deliveries
    await del('rider_ratings', 'delivery_request_id', deliveryIds);
    await del('rider_ratings', 'repair_job_id', jobIds);
    await del('trip_offers', 'trip_id', await (async () => {
      if (!jobIds.length && !deliveryIds.length) return [] as string[];
      const { data } = await admin
        .from('overpass_trips')
        .select('id')
        .or([
          jobIds.length ? `repair_job_id.in.(${jobIds.join(',')})` : null,
          deliveryIds.length ? `delivery_request_id.in.(${deliveryIds.join(',')})` : null,
        ].filter(Boolean).join(','));
      return (data ?? []).map((t: any) => t.id);
    })());
    await del('overpass_trips', 'repair_job_id', jobIds);
    await del('overpass_trips', 'delivery_request_id', deliveryIds);
    await del('delivery_condition_photos', 'delivery_request_id', deliveryIds);
    await del('delivery_condition_photos', 'repair_job_id', jobIds);
    await del('delivery_status_history', 'delivery_request_id', deliveryIds);
    await del('delivery_commissions', 'delivery_request_id', deliveryIds);
    await del('delivery_commissions', 'repair_job_id', jobIds);
    await del('delivery_requests', 'repair_job_id', jobIds);

    // Job-related
    await del('completion_feedback_notifications', 'repair_job_id', jobIds);
    await del('email_notifications', 'repair_job_id', jobIds);
    await del('job_status_history', 'repair_job_id', jobIds);
    await del('payments', 'repair_job_id', jobIds);

    // Conversations
    await del('messages', 'conversation_id', conversationIds);
    await del('conversations', 'repair_center_id', centerId);

    // Jobs
    await del('repair_jobs', 'repair_center_id', centerId);

    // Referrals
    await del('center_referral_rewards', 'referral_id', referralIds);
    await del('center_referral_rewards', 'center_id', centerId);
    if (referralIds.length) await del('center_referrals', 'id', referralIds);

    // Center-owned records
    await del('repair_center_payouts', 'repair_center_id', centerId);
    await del('repair_center_reviews', 'repair_center_id', centerId);
    await del('repair_center_bank_accounts', 'repair_center_id', centerId);
    await del('repair_center_settings', 'repair_center_id', centerId);
    await del('logistics_provider_settings', 'repair_center_id', centerId);
    await del('partner_agreement_acceptances', 'repair_center_id', centerId);
    await del('repair_center_staff', 'repair_center_id', centerId);

    // Branding assets in storage
    const storagePaths: { bucket: string; path: string }[] = [];
    for (const raw of [center.logo_url, center.cover_image_url]) {
      if (typeof raw !== 'string') continue;
      const match = raw.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/);
      if (match) storagePaths.push({ bucket: match[1], path: decodeURIComponent(match[2]) });
    }
    for (const { bucket, path } of storagePaths) {
      const { error } = await admin.storage.from(bucket).remove([path]);
      if (error) console.error(`Storage remove failed (${bucket}/${path}):`, error.message);
    }

    // Finally the center itself
    const { error: centerDeleteError } = await admin
      .from('Repair Center')
      .delete()
      .eq('id', centerId);
    if (centerDeleteError) throw centerDeleteError;

    const { error: logError } = await admin.from('repair_center_purge_log').insert({
      center_id: centerId,
      center_name: center.name,
      center_email: center.email,
      purged_by: user.id,
      deleted_counts: counts,
    });
    if (logError) console.error('Failed to write purge log:', logError.message);

    console.log(`Super admin ${user.id} permanently deleted center ${centerId}`, counts);

    return json({ success: true, center: { id: center.id, name: center.name }, counts });
  } catch (error: any) {
    console.error('purge-repair-center error:', error);
    return json({ error: error.message ?? 'Unexpected error' }, 500);
  }
});
