# One-hour response clock with automatic hand-over to the next centre

When a customer sends their AI diagnosis to a repair centre, that centre gets exactly one hour to reply with a price. Both sides see the same live countdown. One reminder text only. If the hour passes with no price, the request moves itself to the next best centre — online and closest — and the diagnosis travels with it, so the customer never explains the fault twice.

## What the customer sees

- A clock at the top of the chat: "Awaiting price — 47:12 left", counting down live.
- If the centre replies with a price, the clock disappears and the offer card takes over as it does today.
- If the hour runs out: a short message in chat, a notification, and they land in a fresh chat with the next centre, brief already posted. No action needed from them.
- If no other centre is available, they see "No other centre is free right now — we're still looking" and the request stays open with a rechecking sweep.

## What the repair centre sees

- The same countdown, framed as a deadline: "Respond within 47:12 or this job passes to another centre".
- Exactly one reminder text per job, sent when they are offline and the clock is running (replacing today's repeatable message and price reminders for this case).
- When the hour expires their chat is closed out: it moves to a "Missed" state, the deadline strip reads "Passed to another centre", and they can no longer send a price for that job.

## Ranking of the next centre

Only centres that are seen-recently-online, active, and not already tried. Ordered by: closest to the customer's pickup area first, then specialty match to the fault, then rating and experience. The same list logic that already powers "Recommended repair centers" is reused, filtered to online-only and excluding centres that already had their hour.

## Technical notes

**Database**
- New table `center_response_clocks`: `id`, `customer_id`, `repair_center_id`, `conversation_id`, `repair_job_id`, `diagnostic_conversation_id`, `request_key` (stable per customer request chain), `attempt_number`, `started_at`, `expires_at` (started_at + 1 hour), `status` (`running` | `answered` | `expired` | `cancelled`), `handed_off_to` (centre id), plus timestamps. GRANTs for `authenticated` (read own / staff of centre) and `service_role`; RLS policies: customer reads own rows, centre staff read rows for their centre, only service role writes.
- `conversations`: add `response_clock_id` and `handoff_reason`; centre-side closure sets `status = 'missed'`.
- `admin_alert_settings`: add `response_window_minutes` (default 60) so the hour stays admin-tunable; `center-nudge-sweep` reads it.

**Edge functions**
- `handoff-diagnostic-to-center`: accept an optional `requestKey` and `excludeCenterIds`; on success open a clock row (`attempt_number` incremented, one running clock per request chain) and store its id on the conversation. Also stores the transcript exactly as it does now, which is what makes re-handoff free of repeated diagnostics.
- `center-offer` and `provide-repair-quote`: mark the running clock `answered` when a price or inspection request is posted, and reject posting when the clock for that conversation is `expired`.
- New `response-clock-sweep` (service-role, cron every minute): finds `running` clocks past `expires_at`, marks them `expired`, closes the old conversation to `missed`, notifies both sides, then picks the next ranked online centre via the shared ranking helper and calls the same handoff logic with the stored transcript/brief — creating the new conversation, new clock and centre notification. When no candidate exists, it leaves the chain open and retries next minute, telling the customer once.
- Ranking moved into `_shared/centerRanking.ts` used by both `recommend-centers-for-diagnosis` and the sweep, with an `onlineOnly` and `exclude` option based on `center_activity.last_seen_at` inside the online window.
- `center-nudge-sweep`: the `unanswered_message` / `quote_pending` reasons for a job with a running clock collapse into a single `response_clock` nudge, deduplicated on `request_key` so it can never fire twice for the same job.

**Frontend**
- New `ResponseClockStrip` component (shared): subscribes to the clock row over realtime, renders a live mm:ss countdown driven by `expires_at`, with customer wording vs centre wording. Mounted in `LiveChat` above `ConversationJobPanel`.
- `ConversationJobPanel`: hides the centre's offer/inspection actions when the clock is expired and shows "Passed to another centre".
- `RecommendedCentersPanel`: sends a `requestKey` on handoff so the chain is tracked from the first pick.
- Customer notification click-through routes to the new conversation id.
