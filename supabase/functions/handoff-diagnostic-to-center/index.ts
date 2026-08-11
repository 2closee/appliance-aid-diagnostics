import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptMessage {
  role: string;
  content: string;
}

async function generateBrief(params: {
  appliance: string;
  diagnosis: string;
  transcript: TranscriptMessage[];
  report: any;
}): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  const transcriptText = params.transcript
    .slice(-24)
    .map((m) => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`)
    .join('\n');

  const fallback = [
    `Device: ${params.appliance}`,
    `Likely fault: ${params.diagnosis}`,
    params.report?.confidenceScore ? `AI confidence: ${Math.round(params.report.confidenceScore * 100)}%` : null,
  ].filter(Boolean).join('\n');

  if (!apiKey) return fallback;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: [
          {
            role: 'system',
            content:
              'You write short technician briefs for repair shops in Nigeria. Output plain text under 160 words, using these labelled lines only: Device, Reported symptoms, Likely fault, Evidence, Suggested parts, Estimated cost, Urgency, Confidence. Be factual, no greetings, no markdown.',
          },
          {
            role: 'user',
            content: `Device: ${params.appliance}\nAI diagnosis: ${params.diagnosis}\nStructured report: ${JSON.stringify(params.report || {})}\n\nConversation:\n${transcriptText}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('AI brief generation failed:', res.status, await res.text());
      return fallback;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || fallback;
  } catch (e) {
    console.error('AI brief error:', e);
    return fallback;
  }
}

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
    const repairCenterId = Number(body.repairCenterId);
    if (!repairCenterId) throw new Error('repairCenterId is required');

    const appliance = (body.appliance || 'device').toString().slice(0, 100);
    const diagnosis = (body.diagnosis || '').toString().slice(0, 4000);
    const transcript: TranscriptMessage[] = Array.isArray(body.transcript) ? body.transcript.slice(-40) : [];
    const report = body.report || null;
    const diagnosticConversationId = body.diagnosticConversationId || null;
    const attachments = body.attachments || null;

    // Reuse an active conversation between this customer and center, if any.
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, ai_brief')
      .eq('customer_id', user.id)
      .eq('repair_center_id', repairCenterId)
      .eq('status', 'active')
      .maybeSingle();

    const brief = await generateBrief({ appliance, diagnosis, transcript, report });

    let conversationId = existing?.id as string | undefined;

    const payload: Record<string, unknown> = {
      source: 'diagnostic',
      diagnostic_conversation_id: diagnosticConversationId,
      diagnostic_summary: diagnosis.slice(0, 1000),
      ai_brief: brief,
      ai_transcript: { appliance, messages: transcript, report, attachments },
      updated_at: new Date().toISOString(),
    };

    if (conversationId) {
      const { error: updErr } = await supabase
        .from('conversations')
        .update(payload)
        .eq('id', conversationId);
      if (updErr) throw updErr;
    } else {
      const { data: created, error: insErr } = await supabase
        .from('conversations')
        .insert({
          customer_id: user.id,
          repair_center_id: repairCenterId,
          status: 'active',
          ...payload,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      conversationId = created.id;
    }

    // Post the brief as the opening message so it lands in the chat history.
    const { error: msgErr } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_type: 'customer',
      content: `AI Diagnostic Brief\n\n${brief}`,
      priority: report?.repairUrgency === 'critical' || report?.repairUrgency === 'high' ? 'high' : 'normal',
    });
    if (msgErr) console.error('Failed to post brief message:', msgErr);

    // Notify all active staff at the center.
    const { data: staff } = await supabase
      .from('repair_center_staff')
      .select('user_id')
      .eq('repair_center_id', repairCenterId)
      .eq('is_active', true);

    if (staff?.length) {
      const { error: notifErr } = await supabase.from('notifications').insert(
        staff.map((s: any) => ({
          user_id: s.user_id,
          title: 'Incoming repair request',
          message: `New AI-diagnosed ${appliance} request from a customer. Read the brief and respond with an offer.`,
          type: 'incoming_repair',
          related_entity_type: 'conversation',
          related_entity_id: conversationId,
        })),
      );
      if (notifErr) console.error('Failed to insert notifications:', notifErr);
    }

    // Email the center (best effort).
    try {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      const { data: center } = await supabase
        .from('Repair Center')
        .select('name, email')
        .eq('id', repairCenterId)
        .single();

      if (resendKey && center?.email) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FixBudi <noreply@fixbudi.com>',
            to: [center.email],
            subject: `Incoming repair request — ${appliance}`,
            html: `<h2>New repair request from FixBudi</h2><p>A customer completed an AI diagnosis and chose ${center.name}.</p><pre style="white-space:pre-wrap;font-family:inherit;background:#f6f6f6;padding:12px;border-radius:8px">${brief.replace(/</g, '&lt;')}</pre><p>Open your FixBudi dashboard to read the full transcript and send an offer.</p>`,
          }),
        });
        if (!emailRes.ok) console.error('Resend error:', await emailRes.text());
      }
    } catch (e) {
      console.error('Center email failed:', e);
    }

    return new Response(JSON.stringify({ conversationId, brief }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('handoff-diagnostic-to-center error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Handoff failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
