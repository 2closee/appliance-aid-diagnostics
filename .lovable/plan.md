# Reliable live conversations and Ovapass pickup dispatch

## Goal
Make customer-to-repair-center conversations open reliably from the partner portal, update instantly for both parties, show typing activity, and ensure a manual pickup request is offered to the closest eligible Ovapass rider with an immediate alert.

## Confirmed findings
- The database contains the affected active conversations and unread customer messages, and the approved center owner is linked to the same center. Conversation/message RLS permits that owner to read them.
- Chat navigation currently depends on transient router state at `/repair-center-chat`; this is fragile for notification links, refreshes, and direct opens.
- `messages` and `conversations` are already enabled for Supabase Realtime, and the chat subscribes to message inserts.
- Typing presence is not symmetric: repair-center staff track presence, while customers only listen to a center-wide channel and never publish their typing state.
- Closest-rider ranking already exists, but the current searching trip has zero assignment attempts because the only approved online rider has a stale location heartbeat and is excluded. No rider notification record was created.

## Implementation

### 1. Make every conversation directly addressable
- Add a canonical authenticated chat route containing the conversation ID, while keeping the existing route as a compatibility fallback.
- Update repair-center conversation rows, customer conversation rows, negotiation redirects, diagnostic handoffs, and notification actions to open that canonical URL.
- Load the conversation by URL ID, verify the signed-in user is the customer or active staff at that center, then derive the center/job context from the fetched row instead of relying on navigation state.
- Show a real load error with retry/back actions only when the database request fails or access is denied; do not translate missing router state into “No conversation.”
- Correct the conversation-list relation handling so job/customer details render consistently for both job-linked and direct conversations.

### 2. Harden live messaging
- Use one conversation-specific Realtime channel for both participants.
- Subscribe to message inserts and read-status updates, deduplicate events, preserve chronological order, and reconcile with a refetch after reconnect.
- Mark incoming messages read for the correct recipient on both customer and repair-center views.
- Touch the parent conversation timestamp when a message is inserted so active threads move to the top of both lists.
- Keep unread badges and the existing chime synchronized with actual incoming messages.

### 3. Add true two-way typing presence
- Have both customer and repair-center clients join and track the same conversation-specific presence channel.
- Broadcast typing start/stop with participant type, ignore the current user, clear stale typing state on blur/send/disconnect, and clean up channels/timeouts on unmount.
- Display “Customer is typing…” or “Repair center is typing…” in real time.

### 4. Complete closest-rider dispatch and alerts
- Keep the existing nearest-eligible-rider ranking, but return a clear dispatch result when no rider has a fresh location instead of implying a rider was notified.
- When a rider goes online or refreshes location, retry eligible searching trips so a previously stalled manual pickup can be offered automatically.
- On offer creation, write a rider-targeted in-app notification and make the rider app react immediately via Realtime with a chime and refreshed offer card.
- Add an SMS alert fallback through the existing Termii integration for a newly offered trip, without exposing secrets.
- Prevent duplicate live offers and retain timeout/decline reassignment to the next closest eligible rider.
- Update the repair-center pickup card live as the trip changes from searching to offered/accepted, including a truthful “waiting for an available nearby rider” state.

### 5. Database and verification
- Add only the trigger/RPC/policy changes needed to update conversation activity and safely retry/notify rider assignment; preserve current RLS boundaries and grants.
- Verify with two authenticated browser sessions: customer sends, center opens via list/direct URL, both exchange messages, typing appears both ways, unread state clears, and refresh retains the thread.
- Verify pickup dispatch with a fresh online rider location: center requests pickup, closest rider receives the offer/chime/notification, accepts it, and the center sees the status update live. Also test the no-fresh-rider state and automatic retry when a rider comes online.

## Technical scope
Likely touchpoints include the conversation list/chat pages, `LiveChat`, conversation notification and rider hooks, the Ovapass request card, nearest-rider assignment helper/edge functions, Supabase function configuration, and one database migration for conversation activity plus secure dispatch notification support.
