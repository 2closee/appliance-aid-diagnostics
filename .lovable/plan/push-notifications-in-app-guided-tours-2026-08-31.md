# Push Notifications + In-App Guided Tours

Two features: real web push notifications (Firebase Cloud Messaging) and an interactive walkthrough that teaches customers, repair centers and riders how to use the app.

## Part 1 — Web push notifications

### How it hangs together
The app already has one central `notifications` table, and several backend flows insert into it (center offers, diagnostic handoff, protection claims, Ovapass rider dispatch). We use that table as the single trigger point for push, so every future notification automatically gets pushed too.

```text
backend flow → INSERT into notifications → DB trigger → send-push function → FCM → device
```

### Steps
1. **Connect Firebase Cloud Messaging** (connector card in chat) with "Include web push" selected, so the browser can register for push. Nothing is asked for in chat — the credentials go into the connection form.
2. **Device tokens**: new `push_subscriptions` table (user id, FCM token, platform, last seen) with RLS so each user only manages their own tokens, plus service-role access for the sender.
3. **Enable-push UI**: a "Turn on notifications" prompt on the customer, repair center and rider dashboards, plus a toggle in the notification area. Handles the real-world cases honestly: permission denied, unsupported browser, and the Lovable preview iframe (asks the user to open the app in its own tab).
4. **`send-push` edge function**: looks up the recipient's tokens, sends through the Lovable connector gateway, deletes stale/unregistered tokens, and includes a deep link so tapping the notification opens the right page (chat thread, job, rider offer, ticket).
5. **DB trigger** on `notifications` insert that calls `send-push`, so all existing and future producers work with no per-flow wiring.
6. **Fill the gaps** so the four requested trigger groups all produce a notification row:
   - Chat messages — trigger on `messages` inserts, notifying the other side of the conversation (customer or centre staff), skipping the sender.
   - Job & quote updates — quote sent, quote accepted/declined, status changes, ready for return.
   - Rider dispatch — already inserts notifications on offer; add rider-en-route notices for customer and centre.
   - Support & admin alerts — ticket replies, new centre applications, protection claims.
7. **Service worker** `public/firebase-messaging-sw.js` for background notifications, and foreground handling that shows a toast plus the existing chime instead of a duplicate OS banner.

## Part 2 — Interactive walkthrough tours

A lightweight tour component (highlight ring + tooltip + Back / Next / Skip, progress dots) built in-house so it matches the FixBudi design system and needs no new dependency.

- Runs automatically the first time a user lands on their dashboard, once per role.
- Replayable any time from a **Help / Take the tour** item in the navigation menu.
- Completion state stored per user in a new `user_onboarding` table (role, tour key, completed at, skipped) so it does not re-run across devices; falls back to local storage for logged-out views.
- Steps are anchored to real elements by `data-tour` attributes, and steps whose target is missing are skipped so the tour never breaks on a role variation.

### Tour content
- **Customer**: start an AI diagnosis → optional phone self-test → recommended repair centres → read/negotiate the quote in chat → accept and track pickup/return → warranty & protection.
- **Repair center**: incoming jobs list → open a job and send a quote → chat with the customer → request an Ovapass pickup (and the bulky-item queue rule) → mark ready for return → earnings and payouts.
- **Rider**: go online and share location → incoming offer card and accept → navigate with the live map → OTP handoff at pickup and drop-off → earnings and payout request.

Each tour ends with a "You're set" step that points at the Help entry so users know how to replay it.

## Technical notes
- New tables: `push_subscriptions`, `user_onboarding` — both with explicit grants, RLS scoped to `auth.uid()`, and service-role access for edge functions.
- New edge function: `send-push`; called via a `SECURITY DEFINER` trigger function on `notifications`, restricted to `service_role`.
- New DB triggers: push fan-out on `notifications`, and a notification row on `messages` insert.
- FCM is called only through the Lovable connector gateway from server code; no service account or API key ever reaches the browser.
- Push failures never block the originating action — they are logged and swallowed.
