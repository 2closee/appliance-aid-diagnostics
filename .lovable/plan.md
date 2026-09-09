# Customer Intelligence + Repair Centre Responsiveness

Two connected goals: give super admin a real window into who signs up, what they try to do and where it breaks; and make sure a waiting customer never sits in front of an empty repair centre — nudge the centre by SMS when nobody is online.

Verified current state: signups sit in `profiles` (15 accounts). Event tracking already exists (`analytics_events`) but only records page views plus five marketing clicks — nothing about attempts, failures, quotes or handoffs. There is only one repair job in the system so far, and nothing anywhere records when a centre was last active.

## 1. Customer Insights panel (super admin)

New page in the admin panel with three views:

**Signups** — daily/weekly new customers, where they came from (first page seen, referrer), and how far each got: signed up only, started a diagnosis, requested a centre, got a quote, paid.

**Journey funnel** — counts and drop-off between: opened diagnosis → completed self-test → picked a centre → conversation started → quote given → quote accepted → pickup → completed. Each drop-off is clickable to see the actual customers stuck there.

**Friction list** — a ranked list of "things that did not work": diagnosis started but no centre chosen, centre chosen but no reply, quote requested but never quoted, quote given but expired, pickup requested but no rider found, payment attempted and failed, support ticket opened. Each row names the customer, the centre involved and how long they waited.

## 2. Customer detail view

Click any customer and see one timeline: account and contact details, devices and problems described, diagnoses run and self-test results, which centres were recommended, which centre they engaged, whether that centre replied and how fast, quotes and negotiation, pickups and riders, payments, support tickets, and any step that stalled — with a "what's blocking this customer" line at the top.

## 3. Repair centre activity monitoring

Record a light "last active" heartbeat for centre staff (updated when a staff member loads their dashboard, opens a chat or acts on a job) and show a centre league table: online now / last seen, open requests waiting, median first-reply time, median time to quote, quotes given vs ignored, jobs accepted vs abandoned, ratings. Centres with no activity for a chosen period, or with waiting customers, are flagged.

## 4. "Customer is waiting" SMS nudge

When a customer needs a centre and no staff of that centre has been active recently, the centre gets an SMS through the existing Termii setup:

- Triggers: new customer message with no staff reply after X minutes; quote request unanswered after X minutes; a diagnosis handed to the centre with no acknowledgement.
- Message names the customer's device and issue in one line plus a direct link to the partner login.
- Guardrails: only during configurable working hours, at most one nudge per centre per hour and a cap per day, never repeated for the same job, and skipped entirely if a staff member is currently online.
- Escalation: if still unanswered after a second window, the customer is offered other nearby centres and super admin sees the case in the friction list.
- Admin controls the timers, working hours, caps and message text; every nudge sent is logged with the outcome (did the centre come online, did they reply).

## 5. Better tracking so the panel has real data

Add explicit tracked events (not just page views) at each meaningful step and failure point: diagnosis started/abandoned, self-test finished, centre selected, conversation opened, quote requested/received/accepted/rejected/expired, pickup requested, no rider found, payment failed, support ticket opened. This is what makes the funnel and friction list accurate rather than guesswork.

## Technical notes

- New tables: `center_activity` (staff heartbeat: user, centre, last_seen_at, context), `center_nudges` (centre, job/conversation, reason, sent_at, provider result, outcome), `admin_alert_settings` (timers, working hours, caps, template). All in `public` with GRANTs, RLS restricted to admin/super_admin, plus service_role for the edge functions.
- Reuse `analytics_events` for the new step/failure events; add indexes on `(event_name, created_at)` and `user_id`.
- New edge function `center-nudge-sweep`, scheduled every few minutes via pg_cron: finds waiting jobs/conversations, checks heartbeat and rate limits, sends via the existing `_shared/sms/dispatcher.ts` (Termii primary), writes to `center_nudges`, and also inserts an in-app notification for centre staff.
- New admin pages: `src/pages/admin/CustomerInsights.tsx`, `src/pages/admin/CustomerDetail.tsx`, `src/pages/admin/CenterActivity.tsx`, linked from the admin dashboard.
- Heartbeat written via a small `security definer` RPC called from repair-centre dashboard/chat mounts — cheap, no per-keystroke writes.
- Funnel/friction/centre metrics computed in SQL views or a `get-admin-insights` edge function so the browser does one call per view.

## Suggested build order

1. Tracking events + heartbeat + tables (data starts accumulating immediately).
2. Customer Insights panel and customer detail timeline.
3. Centre activity league table.
4. SMS nudge sweep with admin-controlled settings, then escalation to alternative centres.

Phase 1 is worth doing first even if the rest waits — without it the panel would only show page views.
