# AI diagnosis → recommended centers → handoff → offer → pickup

Close the loop after the AI personalized chat: recommend nearby registered centers inside the diagnostic report, hand the whole conversation (plus an AI brief) to the chosen center, let the center make an offer or request physical diagnostics, and keep that one channel open until the job is paid and returned.

## 1. Recommended centers on the diagnostic report

- Under the diagnostic report (and at the bottom of the AI chat), show a "Recommended repair centers" panel with 3 best matches.
- Matching: area/city text match between the user's detected or typed location and the center's address, plus specialty match against the diagnosed device and fault, then rating and experience. Falls back to top-rated active centers when no area match.
- Each card: name, area, rating, specialties, and a single **Chat with this center** button. No need to browse `/repair-centers` again.

## 2. Automatic conversation handoff

- Clicking a recommended center opens the customer↔center chat and links it to the AI diagnostic conversation (already supported by `conversations.diagnostic_conversation_id` / `source` / `diagnostic_summary`).
- The AI writes a short technician brief (device, reported symptoms, likely fault, evidence from photos/video/audio, confidence, suggested parts, cost range, urgency) and it is pinned at the top of the chat for both sides.
- The full AI transcript is attached to the conversation and viewable by the center in a collapsible "AI diagnostic transcript" panel, including media the customer uploaded.
- The center gets an in-app notification ("Incoming repair request") plus an email, and the conversation appears flagged in its inbox with the brief visible.

## 3. Center response: offer or physical diagnostics

Inside the chat the center staff gets two actions:

- **Send offer** — enters price, parts and turnaround. This creates a repair job in quote-pending state tied to this conversation. The customer sees an offer card in the chat with Accept / Decline / Counter, reusing the existing quote accept/reject machinery. On accept, the customer is taken straight to pickup scheduling.
- **Request physical diagnostics** — marks the job as inspection-first: no repair price yet, customer confirms pickup and pays only the delivery fee. After inspection the center posts a physical diagnostic result in the same chat, which then converts into a normal offer for the customer to accept.

## 4. One channel until completion

- The conversation stays active through pickup, repair, payment and return, and only closes when the job reaches completed/returned.
- A status strip at the top of the chat shows the current stage so both sides always see where the job stands.

## Technical notes

- **Database**: add `conversations.ai_brief` (text) and `conversations.ai_transcript` (jsonb); add `repair_jobs.conversation_id`, `repair_jobs.inspection_only` (boolean) and `repair_jobs.inspection_findings` (text); extend the `job_status` enum with `diagnostics_requested` and `diagnostics_completed`. RLS follows the existing customer/center-staff patterns.
- **New edge function `recommend-centers-for-diagnosis`**: takes the diagnosis text, device type and user area; ranks active centers by area/specialty/rating; returns the top 3 with a one-line reason each.
- **New edge function `handoff-diagnostic-to-center`**: creates or reuses the conversation, generates the AI brief via Lovable AI from the diagnostic transcript, stores brief + transcript, posts the brief as the opening pinned message, and inserts the center notification and email.
- **New edge function `center-offer`**: validates the caller is staff at the center, then either creates the quote-pending repair job with the offered price, or creates the inspection-only job for a physical-diagnostics request.
- **Frontend**: `RecommendedCentersPanel` used by `DiagnosticReport`/`Diagnostic.tsx`; `DiagnosticBriefPanel` and `OfferCard` inside `LiveChat`; center action bar in `RepairCenterChat`; job status strip shared by both sides.
- Existing quote provision/response functions are reused for counter-offers and acceptance rather than duplicated.
