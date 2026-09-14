// Shared hand-off: attach a customer's AI diagnosis to a repair centre,
// open the one-hour response clock, and alert the centre.

export interface TranscriptMessage {
  role: string;
  content: string;
}

export interface HandoffParams {
  customerId: string;
  repairCenterId: number;
  appliance: string;
  diagnosis: string;
  // deno-lint-ignore no-explicit-any
  report?: any;
  transcript?: TranscriptMessage[];
  diagnosticConversationId?: string | null;
  // deno-lint-ignore no-explicit-any
  attachments?: any;
  requestKey: string;
  attemptNumber?: number;
  brief?: string | null;
  handoffReason?: string | null;
  senderId?: string | null;
}

export interface HandoffResult {
  conversationId: string;
  brief: string;
  clockId: string | null;
  expiresAt: string | null;
}

export async function generateBrief(params: {
  appliance: string;
  diagnosis: string;
  transcript: TranscriptMessage[];
  // deno-lint-ignore no-explicit-any
  report: any;
}): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  const transcriptText = (params.transcript || [])
    .slice(-24)
    .map((m) => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`)
    .join('\n');

  const fallback = [
    `Device: ${params.appliance}`,
    `Likely fault: ${params.diagnosis}`,
    params.report?.confidenceScore
      ? `AI confidence: ${Math.round(params.report.confidenceScore * 100)}%`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (!apiKey) return fallback;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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

export async function getResponseWindowMinutes(
  // deno-lint-ignore no-explicit-any
  admin: any,
): Promise<number> {
  const { data } = await admin
    .from('admin_alert_settings')
    .select('response_window_minutes')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const minutes = Number(data?.response_window_minutes);
  return minutes > 0 ? minutes : 60;
}

export async function handoffDiagnosticToCenter(
  // deno-lint-ignore no-explicit-any
  admin: any,
  params: HandoffParams,
): Promise<HandoffResult> {
  const {
    customerId,
    repairCenterId,
    appliance,
    diagnosis,
    report = null,
    transcript = [],
    diagnosticConversationId = null,
    attachments = null,
    requestKey,
  } = params;

  const brief =
    params.brief ||
    (await generateBrief({ appliance, diagnosis, transcript, report }));

  // Reuse an active conversation between this customer and centre, if any.
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('customer_id', customerId)
    .eq('repair_center_id', repairCenterId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    source: 'diagnostic',
    diagnostic_conversation_id: diagnosticConversationId,
    diagnostic_summary: diagnosis.slice(0, 1000),
    ai_brief: brief,
    ai_transcript: { appliance, messages: transcript, report, attachments, request_key: requestKey },
    handoff_reason: params.handoffReason ?? null,
    updated_at: new Date().toISOString(),
  };

  let conversationId: string;
  if (existing?.id) {
    conversationId = existing.id;
    const { error: updErr } = await admin.from('conversations').update(payload).eq('id', conversationId);
    if (updErr) throw updErr;
  } else {
    const { data: created, error: insErr } = await admin
      .from('conversations')
      .insert({ customer_id: customerId, repair_center_id: repairCenterId, status: 'active', ...payload })
      .select('id')
      .single();
    if (insErr) throw insErr;
    conversationId = created.id;
  }

  // Close any other running clock for this request chain, then open a new one.
  await admin
    .from('center_response_clocks')
    .update({ status: 'cancelled' })
    .eq('request_key', requestKey)
    .eq('status', 'running');

  const windowMinutes = await getResponseWindowMinutes(admin);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + windowMinutes * 60000);

  const { data: clock, error: clockErr } = await admin
    .from('center_response_clocks')
    .insert({
      request_key: requestKey,
      customer_id: customerId,
      repair_center_id: repairCenterId,
      conversation_id: conversationId,
      diagnostic_conversation_id: diagnosticConversationId,
      attempt_number: params.attemptNumber ?? 1,
      status: 'running',
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id, expires_at')
    .maybeSingle();
  if (clockErr) console.error('Failed to open response clock:', clockErr);

  if (clock?.id) {
    await admin.from('conversations').update({ response_clock_id: clock.id }).eq('id', conversationId);
  }

  // Post the brief so it lands in the chat history for both sides.
  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: params.senderId ?? customerId,
    sender_type: 'customer',
    content: `AI Diagnostic Brief\n\n${brief}`,
    priority: report?.repairUrgency === 'critical' || report?.repairUrgency === 'high' ? 'high' : 'normal',
  });
  if (msgErr) console.error('Failed to post brief message:', msgErr);

  // Notify all active staff at the centre.
  const { data: staff } = await admin
    .from('repair_center_staff')
    .select('user_id')
    .eq('repair_center_id', repairCenterId)
    .eq('is_active', true);

  if (staff?.length) {
    const { error: notifErr } = await admin.from('notifications').insert(
      // deno-lint-ignore no-explicit-any
      staff.filter((s: any) => s.user_id).map((s: any) => ({
        user_id: s.user_id,
        title: 'Incoming repair request — respond within the hour',
        message: `New AI-diagnosed ${appliance} request. You have ${windowMinutes} minutes to send a price before it passes to another centre.`,
        type: 'incoming_repair',
        related_entity_type: 'conversation',
        related_entity_id: conversationId,
      })),
    );
    if (notifErr) console.error('Failed to insert notifications:', notifErr);
  }

  // Email the centre (best effort).
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const { data: center } = await admin
      .from('Repair Center')
      .select('name, email')
      .eq('id', repairCenterId)
      .maybeSingle();

    if (resendKey && center?.email) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'FixBudi <noreply@fixbudi.com>',
          to: [center.email],
          subject: `Incoming repair request — ${appliance} (respond within ${windowMinutes} min)`,
          html: `<h2>New repair request from FixBudi</h2><p>A customer completed an AI diagnosis and was matched with ${center.name}. Send a price within ${windowMinutes} minutes or the request passes to another centre.</p><pre style="white-space:pre-wrap;font-family:inherit;background:#f6f6f6;padding:12px;border-radius:8px">${brief.replace(/</g, '&lt;')}</pre><p><a href="${Deno.env.get('APP_URL') ?? 'https://fixbudi.com'}/partner-login">Open your FixBudi dashboard</a></p>`,
        }),
      });
      if (!emailRes.ok) console.error('Resend error:', await emailRes.text());
    }
  } catch (e) {
    console.error('Center email failed:', e);
  }

  return {
    conversationId,
    brief,
    clockId: clock?.id ?? null,
    expiresAt: clock?.expires_at ?? null,
  };
}
