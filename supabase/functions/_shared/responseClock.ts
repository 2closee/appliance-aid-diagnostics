// Helpers for the one-hour centre response clock.

export interface ResponseClock {
  id: string;
  request_key: string;
  customer_id: string;
  repair_center_id: number;
  conversation_id: string | null;
  repair_job_id: string | null;
  diagnostic_conversation_id: string | null;
  attempt_number: number;
  status: string;
  started_at: string;
  expires_at: string;
}

const SELECT =
  'id, request_key, customer_id, repair_center_id, conversation_id, repair_job_id, diagnostic_conversation_id, attempt_number, status, started_at, expires_at';

export async function findClock(
  // deno-lint-ignore no-explicit-any
  admin: any,
  by: { conversationId?: string | null; repairJobId?: string | null },
): Promise<ResponseClock | null> {
  if (by.conversationId) {
    const { data } = await admin
      .from('center_response_clocks')
      .select(SELECT)
      .eq('conversation_id', by.conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as ResponseClock;
  }
  if (by.repairJobId) {
    const { data } = await admin
      .from('center_response_clocks')
      .select(SELECT)
      .eq('repair_job_id', by.repairJobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as ResponseClock;
  }
  return null;
}

/** Throws when this centre already lost the job to another centre. */
export async function assertCentreStillOnTheClock(
  // deno-lint-ignore no-explicit-any
  admin: any,
  by: { conversationId?: string | null; repairJobId?: string | null },
): Promise<void> {
  const clock = await findClock(admin, by);
  if (clock && clock.status === 'expired') {
    throw new Error('This request already passed to another repair centre — you can no longer price it.');
  }
}

/** Stops the countdown once the centre has responded with a price or inspection request. */
export async function markClockAnswered(
  // deno-lint-ignore no-explicit-any
  admin: any,
  by: { conversationId?: string | null; repairJobId?: string | null },
): Promise<void> {
  const clock = await findClock(admin, by);
  if (!clock || clock.status !== 'running') return;
  await admin
    .from('center_response_clocks')
    .update({ status: 'answered', answered_at: new Date().toISOString() })
    .eq('id', clock.id);
}

/** Keeps the clock's job link current so job-based lookups work. */
export async function linkClockToJob(
  // deno-lint-ignore no-explicit-any
  admin: any,
  conversationId: string,
  repairJobId: string,
): Promise<void> {
  await admin
    .from('center_response_clocks')
    .update({ repair_job_id: repairJobId })
    .eq('conversation_id', conversationId)
    .is('repair_job_id', null);
}
