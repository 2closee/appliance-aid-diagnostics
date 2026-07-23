
# Gadget-Focused Logistics Workflow — Full Rollout Plan

Reshape Fixbudi's logistics around small, high-value gadgets. Bulky items (ACs, TVs, fridges, washers) skip the logistics API entirely — repair centers arrange their own pickup. Small items (phones, laptops, tablets, consoles, cameras) flow through a provider-agnostic dispatcher scaffolded for Kwik Delivery + Bolt Business, with automatic failover.

## Phase 1 — Item Routing & Provider Scaffold

**Appliance categorization**
- Add a `logistics_category` mapping in `src/lib/logistics/itemRouting.ts`:
  - `gadget`: phone, smartphone, laptop, tablet, ipad, iphone, macbook, console, playstation, xbox, camera, smartwatch, earbuds, headphones
  - `bulky`: ac, air conditioner, tv, television, fridge, refrigerator, freezer, washing machine, dryer, microwave, generator, inverter
- Helper `getLogisticsCategory(applianceType: string): 'gadget' | 'bulky'`.

**Booking-flow branching** (in `PickupRequest.tsx` / `PickupSelection.tsx`)
- Gadget → existing API dispatch UI (quote + schedule).
- Bulky → show info card: *"Our partner service center will contact you within 2 hours to schedule specialized pickup for your {appliance_type}."* Skip quote call. Notify center via `send-job-notification` with new `email_type: 'bulky_pickup_arrangement'`.
- Persist `logistics_category` on `repair_jobs` (migration).

**Provider-agnostic dispatcher** (edge functions, scaffolded — Kwik/Bolt as future adapters)
- New shared module `supabase/functions/_shared/logistics/`:
  - `types.ts` — `LogisticsProvider` interface (`getQuote`, `createDelivery`, `cancelDelivery`, `handleWebhook`).
  - `kwik.ts` — stub adapter with request/response shapes matching Kwik API docs; throws `PROVIDER_NOT_CONFIGURED` until `KWIK_API_KEY` secret is added.
  - `bolt.ts` — same, for Bolt Business (`BOLT_API_KEY`).
  - `sendstack.ts` — wrap current Sendstack integration as default active provider.
  - `dispatcher.ts` — orders providers by priority (Kwik → Bolt → Sendstack), calls each until one succeeds; logs failover reason to `delivery_status_history`.
- Refactor `create-delivery` and `get-delivery-quote` to call `dispatcher` instead of Terminal Africa directly. Existing Terminal/Sendstack flows keep working; Kwik/Bolt activate when their secrets are added.
- Payload always sets `vehicle_type: "bike"` and `category: "small_parcel"` for gadget dispatches.

## Phase 2 — Security & Trust

**4-digit OTP handoff**
- Schema: add `pickup_otp` (text, 4 digits), `pickup_otp_verified_at`, `return_otp`, `return_otp_verified_at` to `delivery_requests`.
- Generated on delivery creation; shown to customer in `DeliveryTracking.tsx` with copy button.
- New edge function `verify-delivery-otp` — rider-facing endpoint (public, rate-limited) that accepts `delivery_id + otp` and marks `pickup_otp_verified_at`. Locked by RLS + short-lived token embedded in rider SMS link.
- Status can't advance to `picked_up` until OTP verified.

**Photo proof of condition**
- New storage bucket `delivery-condition-photos` (private, RLS: customer + assigned center + admins).
- `DeliveryTracking.tsx` gains "Snap device condition" step before rider arrives. Multi-photo upload (max 4), stored under `{delivery_id}/pre-pickup/`.
- Post-repair equivalent under `{delivery_id}/pre-return/` captured by center.
- New table `delivery_condition_photos` (delivery_id, phase enum, photo_url, uploaded_by, created_at).

**Rider info display**
- `DeliveryTracking.tsx` shows rider name, phone, vehicle — all prefixed *"Your Fixbudi rider"* for branded feel. Data comes from provider webhook payload stored on `delivery_requests`.

## Phase 3 — Partner Alignment

- New page `src/pages/RepairCenterOnboarding.tsx` (linked from center dashboard): workflow SOP explaining "Do not arrange pickup for gadgets — Fixbudi dispatches. For bulky items, contact customer within 2h."
- Center dashboard gains "Bulky Pickup Queue" widget (`CenterBulkyPickupQueue.tsx`) listing jobs with `logistics_category='bulky'` awaiting center-arranged pickup, with "Mark contacted" and "Mark picked up" actions.

## Phase 4 — Geofenced PH Pilot

- New table `logistics_service_zones` (zone_name, city, polygon_geojson, active, provider_priority text[]).
- Seed 3 PH zones: GRA Phase 2, Rumuola, Trans Amadi.
- `dispatcher.ts` checks pickup lat/lng against active zones. Outside all active zones → return `OUT_OF_SERVICE_AREA` and booking UI shows waitlist form.
- Per-zone provider priority: dispatcher reads `provider_priority` array for the zone (e.g., GRA prefers Kwik-first, Trans Amadi prefers Bolt-first).
- Admin UI `src/pages/admin/LogisticsZones.tsx` (super_admin only) to toggle zones and reorder provider priority.

## Phase 5 — Feedback Loop & Rider Ratings

- New table `rider_ratings` (delivery_id, rating 1-5, professionalism 1-5, punctuality 1-5, comment, created_by).
- `DeliveryTracking.tsx` prompts rating once status = `delivered`.
- Admin analytics page `src/pages/admin/LogisticsAnalytics.tsx`:
  - Time-to-dispatch (avg, p95) per provider per zone
  - Successful delivery rate per provider
  - Average rider rating per provider
  - Failover incidence
- Data feeds volume-discount negotiation conversations later.

## Cross-Cutting

- **Branded SMS**: extend `send-job-notification` with templates for `rider_dispatched`, `rider_arriving`, `pickup_completed`, `return_dispatched`. All say "Your Fixbudi rider {name} ({phone_masked}). Pickup code: {otp}". Uses existing Resend/Sendstack SMS depending on availability.
- **i18n**: new keys under `logistics.*` for all customer-facing strings in EN/FR/ES/PT.
- **Analytics events**: `BulkyPickupShown`, `GadgetQuoteRequested`, `OTPVerified`, `PhotoProofUploaded`, `RiderRated`.

## Technical Section

### Database migrations
1. `repair_jobs`: add `logistics_category text check in ('gadget','bulky')`; backfill via item-routing helper server-side.
2. `delivery_requests`: add `pickup_otp`, `pickup_otp_verified_at`, `return_otp`, `return_otp_verified_at`, `provider_name text`, `failover_from text`.
3. New `delivery_condition_photos` + RLS (customer sees own, center sees assigned, admins all).
4. New `logistics_service_zones` + RLS (public SELECT active zones; super_admin write).
5. New `rider_ratings` + RLS (owner of delivery inserts, super_admin/center reads).
6. All new public tables get explicit GRANT block (authenticated + service_role; anon only for `logistics_service_zones` reads).

### Storage
- Create `delivery-condition-photos` private bucket via `supabase--storage_create_bucket` with RLS policies.

### Secrets to add later
- `KWIK_API_KEY`, `KWIK_WEBHOOK_SECRET`
- `BOLT_BUSINESS_API_KEY`, `BOLT_WEBHOOK_SECRET`
- Adapters no-op with clear log until secrets present; dispatcher skips to next provider.

### Edge functions
- New: `verify-delivery-otp`, `kwik-webhook`, `bolt-webhook` (scaffold), `rate-rider`.
- Refactored: `create-delivery`, `get-delivery-quote`, `cancel-delivery`, `update-job-status` (branch on `logistics_category`).

### Frontend
- New files: `src/lib/logistics/itemRouting.ts`, `src/components/BulkyPickupNotice.tsx`, `src/components/OTPHandoffCard.tsx`, `src/components/ConditionPhotoUpload.tsx`, `src/components/RiderRatingDialog.tsx`, `src/pages/admin/LogisticsZones.tsx`, `src/pages/admin/LogisticsAnalytics.tsx`, `src/pages/RepairCenterOnboarding.tsx`, `src/components/dashboard/CenterBulkyPickupQueue.tsx`.
- Modified: `PickupRequest.tsx`, `PickupSelection.tsx`, `DeliveryTracking.tsx`, `useDeliveryActions.ts`, `send-job-notification/index.ts`, `Admin.tsx` (nav links).

### Rollout notes
Kwik/Bolt adapters land inactive. Sendstack stays the live provider until you paste Kwik/Bolt credentials, at which point they auto-promote per zone priority. This lets us ship the workflow now and flip providers on later without redeployment.

## Out of Scope (this plan)
- Real Kwik/Bolt live wiring (needs credentials + sandbox testing per Phase 1 of the feedback).
- Insurance/liability contract text — legal task, not code.
- Post-100-delivery discount negotiation — operational, not code.
