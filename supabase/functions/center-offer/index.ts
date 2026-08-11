import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (userError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const conversationId: string = body.conversation_id;
    const mode: string = body.mode; // 'offer' | 'inspection' | 'findings'
    if (!conversationId) throw new Error('conversation_id is required');
    if (!['offer', 'inspection', 'findings'].includes(mode)) throw new Error('Invalid mode');

    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('id, customer_id, repair_center_id, repair_job_id, diagnostic_summary, ai_brief, ai_transcript, diagnostic_conversation_id')
      .eq('id', conversationId)
      .single();
    if (convErr || !conversation) throw new Error('Conversation not found');

    // Caller must be active staff at this center.
    const { data: staff } = await supabase
      .from('repair_center_staff')
      .select('id')
      .eq('user_id', user.id)
      .eq('repair_center_id', conversation.repair_center_id)
      .eq('is_active', true)
      .maybeSingle();
    if (!staff) throw new Error('Forbidden: not staff at this repair center');

    // Find the linked job, if any.
    let jobId: string | null = conversation.repair_job_id || null;
    if (!jobId) {
      const { data: linked } = await supabase
        .from('repair_jobs')
        .select('id')
        .eq('conversation_id', conversationId)
        .maybeSingle();
      jobId = linked?.id ?? null;
    }

    const transcript: any = conversation.ai_transcript || {};
    const applianceType = (transcript.appliance || body.appliance_type || 'device').toString();

    if (mode === 'findings') {
      if (!jobId) throw new Error('No job to attach findings to');
      const findings = (body.inspection_findings || '').toString().trim();
      const quotedCost = body.quoted_cost != null ? Number(body.quoted_cost) : null;
      if (!findings) throw new Error('inspection_findings is required');

      const update: Record<string, unknown> = {
        inspection_findings: findings,
        job_status: quotedCost ? 'quote_pending_review' : 'diagnostics_completed',
      };
      if (quotedCost) {
        update.quoted_cost = quotedCost;
        update.quote_provided_at = new Date().toISOString();
        update.quote_notes = body.quote_notes || findings;
      }

      const { error: updErr } = await supabase.from('repair_jobs').update(update).eq('id', jobId);
      if (updErr) throw updErr;

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: 'repair_center',
        content: `Physical diagnostics result\n\n${findings}${quotedCost ? `\n\nRepair offer: ₦${quotedCost.toLocaleString()}` : ''}`,
      });

      await supabase.from('notifications').insert({
        user_id: conversation.customer_id,
        title: quotedCost ? 'Inspection done — offer ready' : 'Inspection result available',
        message: `The repair center posted the physical diagnostics result for your ${applianceType}.`,
        type: 'inspection_result',
        related_entity_type: 'repair_job',
        related_entity_id: jobId,
      });

      return new Response(JSON.stringify({ repair_job_id: jobId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // offer / inspection: ensure a job exists for this conversation.
    if (!jobId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', conversation.customer_id)
        .maybeSingle();

      const { data: address } = await supabase
        .from('saved_addresses')
        .select('address_line, city, state')
        .eq('user_id', conversation.customer_id)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: created, error: createErr } = await supabase
        .from('repair_jobs')
        .insert({
          user_id: conversation.customer_id,
          repair_center_id: conversation.repair_center_id,
          customer_name: profile?.full_name || 'FixBudi Customer',
          customer_email: profile?.email || 'unknown@fixbudi.com',
          customer_phone: profile?.phone || 'Not provided',
          pickup_address: address
            ? [address.address_line, address.city, address.state].filter(Boolean).join(', ')
            : 'To be provided at pickup scheduling',
          appliance_type: applianceType,
          issue_description: conversation.diagnostic_summary || conversation.ai_brief || 'Reported via AI diagnostic chat',
          conversation_id: conversationId,
          diagnostic_conversation_id: conversation.diagnostic_conversation_id,
          ai_diagnosis_summary: conversation.ai_brief,
          ai_confidence_score: transcript?.report?.confidenceScore ?? null,
          ai_estimated_cost_min: transcript?.report?.estimatedCost?.min ?? null,
          ai_estimated_cost_max: transcript?.report?.estimatedCost?.max ?? null,
          diagnostic_attachments: transcript?.attachments ?? null,
          job_status: 'requested',
        })
        .select('id')
        .single();
      if (createErr) throw createErr;
      jobId = created.id;

      await supabase.from('conversations').update({ repair_job_id: jobId }).eq('id', conversationId);
    }

    if (mode === 'offer') {
      const quotedCost = Number(body.quoted_cost);
      if (!quotedCost || quotedCost <= 0) throw new Error('A valid quoted_cost is required');
      const turnaround = body.turnaround_days ? Number(body.turnaround_days) : null;
      const notes = [body.quote_notes, turnaround ? `Turnaround: ${turnaround} day(s)` : null]
        .filter(Boolean)
        .join('\n');

      const { error: updErr } = await supabase
        .from('repair_jobs')
        .update({
          quoted_cost: quotedCost,
          quote_notes: notes || null,
          quote_provided_at: new Date().toISOString(),
          inspection_only: false,
          job_status: 'quote_pending_review',
        })
        .eq('id', jobId);
      if (updErr) throw updErr;

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: 'repair_center',
        content: `Repair offer: ₦${quotedCost.toLocaleString()}${turnaround ? ` · ${turnaround} day(s) turnaround` : ''}${body.quote_notes ? `\n\n${body.quote_notes}` : ''}`,
      });

      await supabase.from('notifications').insert({
        user_id: conversation.customer_id,
        title: 'You have a repair offer',
        message: `The repair center quoted ₦${quotedCost.toLocaleString()} for your ${applianceType}. Review and accept to schedule pickup.`,
        type: 'quote_received',
        related_entity_type: 'repair_job',
        related_entity_id: jobId,
      });
    } else {
      // inspection: no price yet, customer only pays pickup.
      const reason = (body.inspection_reason || 'Physical inspection needed to confirm the fault.').toString();

      const { error: updErr } = await supabase
        .from('repair_jobs')
        .update({
          inspection_only: true,
          quoted_cost: null,
          quote_notes: reason,
          job_status: 'diagnostics_requested',
        })
        .eq('id', jobId);
      if (updErr) throw updErr;

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: 'repair_center',
        content: `Physical diagnostics requested\n\n${reason}\n\nNo repair fee yet — you only pay the pickup/delivery fee. We'll post the inspection result here and follow with a firm offer.`,
      });

      await supabase.from('notifications').insert({
        user_id: conversation.customer_id,
        title: 'Physical diagnostics requested',
        message: `The repair center wants to inspect your ${applianceType} in person. Schedule pickup to continue — you only pay the delivery fee.`,
        type: 'diagnostics_requested',
        related_entity_type: 'repair_job',
        related_entity_id: jobId,
      });
    }

    return new Response(JSON.stringify({ repair_job_id: jobId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('center-offer error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
