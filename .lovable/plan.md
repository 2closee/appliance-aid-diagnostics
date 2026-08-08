# Overpass Riders inside FixBudi

Build Overpass as a rider portal inside FixBudi (same app, same database, `/rider` routes, new `rider` role). This removes the dependency on Kwik/Bolt/Fez for Port Harcourt and lets your own e-bikes plus vetted third-party bike owners fulfil pickups and returns.

## Recommended commercial model

Mixed fleet, one fee formula:

- **Fleet types:** `company` (your 4-5 e-bikes, rider gets a stipend/salary) and `partner` (an owner-rider on their own bike, earns per trip). Same app, same job flow — only the payout differs.
- **Customer fee (standard, distance-based):**
  `fee = base_fare + (per_km x distance_km)`, clamped to `min_fare`, plus optional `bulky_surcharge` and `after_hours_surcharge`. All values live in one editable `overpass_pricing` row per city so you tune without code changes.
- **Commission:** FixBudi keeps a percentage of every trip fee (suggest 20% for partner riders, 100% for company bikes since the bike and rider are yours). Stored per trip so reporting is exact.
- **Cash first, wallet second:** riders collect cash on delivery at launch. Each trip writes a `rider_ledger` entry (`+rider_earning`, `-commission_owed`). Riders settle commission weekly; the app shows "you owe FixBudi ₦X". Later this can flip to Paystack-collected fees with automated rider payouts.
- **KYC gate:** a partner rider can only go online after admin approval (ID, bike photo/plate, guarantor, selfie). Unapproved riders see a "pending review" screen.

## Assignment: auto-assign nearest rider

1. Repair center approves pickup in the chat/job screen.
2. A trip is created, the pickup point is matched to a service zone, and an OTP is generated (reuse the existing pickup/return OTP columns).
3. The dispatcher ranks online, approved, idle riders in that zone by distance from the pickup point and offers the trip to the nearest one with a 60-second countdown.
4. Decline or timeout -> offer moves to the next rider automatically, up to N attempts, then it surfaces in the admin dispatch board for manual assignment.
5. Rider app shows the job, navigates, collects the device, enters the pickup OTP, uploads condition photos (this already exists), rides to the center, and the center enters the drop OTP.
6. Trip completion writes the fee, commission and rider earning, and unlocks the existing rider rating flow.

## Phases

**Phase 1 - Foundation**
Database: `riders` (profile, fleet_type, kyc_status, bike details, online flag, last known position), `rider_locations` (heartbeat history), `overpass_trips` (links to `repair_jobs` and `delivery_requests`, status, distance, fee, commission, rider earning, OTPs), `trip_offers` (offer, countdown, accept/decline), `rider_ledger`, `overpass_pricing`. Add `rider` to the `app_role` enum with RLS so a rider only ever sees their own rows and their offered/active trips.

**Phase 2 - Rider app (`/rider`)**
Mobile-first PWA screens: signup + KYC upload, pending-review state, online/offline toggle with background location heartbeat, incoming offer sheet with countdown, active trip screen (map, call customer, OTP entry, photo proof), trip history, earnings and "commission owed".

**Phase 3 - Dispatch engine**
Edge functions: `overpass-create-trip` (called when a center approves pickup), `overpass-assign` (nearest-rider ranking + offer rotation), `overpass-respond-offer`, `overpass-trip-status`, plus reuse of `verify-delivery-otp`. Supabase Realtime pushes offers and status changes to rider and customer instantly.

**Phase 4 - Customer and center experience**
Customer tracking shows the assigned Overpass rider (name, photo, bike, ETA, live position on the existing Mapbox map) and the delivery fee breakdown before confirming. Repair center dashboard gets an "Overpass pickup" action alongside the existing bulky queue.

**Phase 5 - Admin control room**
`/admin/overpass`: live map of all bikes, active trips, KYC approval queue, pricing editor, per-rider performance (acceptance rate, on-time rate, rating), commission owed and settlement marking.

**Phase 6 - Hardening**
Fallback to the existing Fez/Bolt/Terminal dispatcher when no rider accepts, bulky items still routed to center logistics, offline-tolerant OTP entry, and rider fraud checks (photo proof required, GPS trace on every trip).

## Practical notes for 4-5 bikes

- Park one bike per active repair center and treat each center's radius as its service zone; zones already exist in `logistics_service_zones` and can be reused.
- With this few bikes, geofencing matters more than clever routing: cap pickups to roughly 7 km from a center so a rider can do 6-8 trips a day.
- Recruit partner riders from day one — company bikes cover the baseline, partners absorb peaks without extra capital.
- Keep the Fez/Bolt scaffold in place as overflow; do not delete it.

## Technical details

- Distance: Mapbox Directions via a server-side edge function (the `MAPBOX_PUBLIC_TOKEN` secret already exists) with a haversine fallback, so fees are based on real road distance.
- Live location: rider app posts a position every 15-20 seconds while online; customers read it through Realtime, not by polling.
- Every new public table gets explicit GRANTs plus RLS scoped by `auth.uid()` and the `has_role` helper.
- `overpass_trips` is the source of truth for a trip; `delivery_requests` keeps the existing customer-facing tracking record with `provider = 'overpass'`, so nothing already built breaks.
- Money: no card flow in Phase 1-5 — cash on delivery plus ledger. Paystack-collected fees and automated rider payouts are a later, separate piece of work.

## Out of scope for now

Standalone Overpass mobile app in the stores, cars/vans, third-party fleet marketplaces, and automated rider payouts.
