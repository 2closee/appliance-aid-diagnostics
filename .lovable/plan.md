# Correct Ovapass naming and make bulky dispatch reliable

## Verified cause

- The active TV pickup is correctly classified as `bulky`, has valid pickup coordinates, and is about 0.5 km from the only active rider.
- That rider is approved, online, available, location-fresh, and configured with `carry_capability = both`, so the rider qualifies for this trip.
- Dispatch did create an offer for that rider at 08:39 UTC, but it expired after 60 seconds without acceptance.
- The immediate in-app alert failed because dispatch inserts notification type `ovapass_offer`, while the database only allows `info`, `reminder`, `alert`, `success`, or `warning`. Consequently, there is no notification row for this offer. The rider can only see the short-lived offer if the Ovapass rider screen is already open and its realtime listener catches it.
- After expiration, the rider is permanently excluded from that trip because all prior offers—including expired ones—are excluded. With only one suitable rider, the trip remains `searching` even though that rider is still nearby and active.

## What will change

### 1. Correct the name everywhere users see it

- Replace any remaining visible copy, labels, notification text, comments, logs, channel names, and local code symbols from **Overpass** to **Ovapass**.
- Keep existing database table names and deployed edge-function slugs temporarily as compatibility identifiers (`overpass_trips`, `overpass_pricing`, `overpass-create-trip`, etc.). Renaming those in place would break existing data, generated Supabase types, and current callers; they will not remain visible to users.
- Use Ovapass naming for new notification metadata and realtime channel labels.

### 2. Fix immediate rider alerts

- Insert the offer notification with an allowed notification type such as `alert`, so the row is created and delivered to the rider.
- Keep the Ovapass-specific meaning in `related_entity_type` and link the alert to the trip so tapping it opens the rider dashboard/offer.
- Subscribe the rider experience to its notification/offer stream and play the chime for a new offer without double-playing when both events arrive.
- Retain SMS as a fallback and improve dispatch logging so an SMS-provider failure is independently visible.

### 3. Make offer rotation reliable

- Do not permanently exclude an eligible rider merely because a previous offer expired. Allow a cooldown and then re-offer when no other suitable rider is available.
- Keep declined offers excluded for that dispatch cycle; do not immediately pressure a rider who explicitly declined.
- Increase the practical response window and show a fresh countdown in the rider app.
- Add a scheduled retry path for searching trips and retain retries when riders come online or refresh location, so reliability does not depend on a center repeatedly pressing “Search again.”
- Prevent duplicate simultaneous offers with a database-safe guard before creating a new offer.

### 4. Show the center the real state

- Distinguish between “offer sent—waiting for rider,” “offer expired—retrying,” and “no suitable bulky vehicle nearby.”
- Show the latest assignment reason and retry automatically while preserving the manual retry button.
- Correct the current copy that says only “van or truck”; admin-approved bulky capability remains authoritative, including the active rider’s registered vehicle/capability.

### 5. Recover and verify the active pickup

- Retry the current TV pickup after deploying the alert and rotation fixes.
- Verify that the nearby qualified rider receives an in-app alert, chime, visible offer, and SMS fallback; can accept it; and that the repair center sees the trip move from searching to accepted in realtime.
- Test both paths: automatic dispatch immediately after quote acceptance and manual pickup request.
- Confirm gadget trips still prefer Ovapass fleet riders and fall back to nearby third-party riders, while bulky trips only reach approved bulky-capable riders.

## Technical details

- Update the shared assignment/notification logic, rider hook/home screen, and repair-center pickup status component.
- Add a database migration only where needed for retry scheduling/offer uniqueness and Realtime publication; preserve existing RLS boundaries and grants.
- Search the full repository after implementation and ensure any remaining `overpass` strings are documented internal compatibility identifiers only.
