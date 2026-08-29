# Wider rider search radius + admin-editable per-vehicle rates

## What is happening now (verified)

- The live pricing row for Port Harcourt has `max_radius_km = 7`, so any rider more than 7 km from the pickup is skipped — both in the edge assignment code (`assign.ts`) and in the every-minute database dispatcher.
- There is a single `per_km = 150` rate for every vehicle. Bulky work only has a flat `bulky_surcharge`, currently `0`, so a van and an e-bike are charged identically per kilometre.
- There is no admin screen for pricing at all: the Ovapass admin page has Riders, Trips and Payments tabs only, so every rate change needs a database edit.
- Rider vehicle classes already exist on `riders` (`bike`, `car`, `suv`, `van`, `truck`) together with `carry_capability`, so per-class rates can key off real data.

## What to build

### 1. Search widens instead of failing

- Raise the hard cut-off to a configurable maximum search radius, default **58 km**. Riders beyond 58 km are never offered the trip.
- Keep nearest-first ranking: the closest qualifying rider is always offered first, then the next closest, out to 58 km. No rider is skipped just for being far when nobody nearer is available.
- Keep a "preferred" radius (default 7 km) used only for reporting, so the admin can still see whether a trip was served locally or pulled from far away.
- While nothing qualifies, the trip stays `searching` and the customer sees an honest status: "No rider near you yet — still searching." The existing minute-by-minute dispatcher keeps retrying, so as soon as a qualifying rider comes online or moves into the 58 km range, the offer is created and the rider is alerted (in-app + chime + SMS) and can accept or decline.
- Riders with no known GPS position stay eligible only through their home zone, as today.

### 2. Per-vehicle-class cost per kilometre

- New rate table keyed by city + vehicle class covering `bike`, `e_bike`, `car`, `suv`, `van`, `truck`, each with its own `per_km`, `base_fare` and `min_fare` (fuel and size differ per class).
- Trip pricing at creation time is an estimate before a rider is known: gadget trips quote at the bike/e-bike rate, bulky trips quote at the van rate. Once a rider accepts, the fare is recalculated from that rider's actual vehicle class, and the trip records both the quoted and the final fare so nothing changes silently for the customer.
- Rider earnings and commission continue to derive from the final fare exactly as today (fleet share vs partner commission unchanged).

### 3. Super admin pricing controls

- New "Pricing" tab on the Ovapass admin page, visible to super admins only, to edit: maximum search radius, preferred radius, offer timeout, base/min fare, after-hours surcharge, and the per-km rate for each vehicle class — with save-per-row and validation (no negative or zero rates).
- Changes take effect on the next trip and on the next dispatcher sweep; existing priced trips are untouched.

## Technical scope

- Migration: `overpass_vehicle_rates` table (city, vehicle_class, per_km, base_fare, min_fare, active, timestamps) seeded from today's values with sensible class multipliers; `max_search_radius_km` (default 58) and `preferred_radius_km` (default 7) columns on `overpass_pricing`; GRANTs plus RLS allowing everyone to read active rates and only admins/super admins to write; update `public.dispatch_searching_ovapass_trips()` to use the 58 km cap; add `quoted_fee` / `rate_vehicle_class` columns on `overpass_trips`.
- Edge functions: `_shared/overpass/geo.ts` (rate lookup by vehicle class in `calculateFee`), `_shared/overpass/assign.ts` (radius from `max_search_radius_km`, repricing on acceptance), `overpass-create-trip` (quote class), and the accept path in `overpass-respond-offer`.
- Frontend: `src/pages/admin/OvapassAdmin.tsx` (Pricing tab), `RequestOvapassRider.tsx` / `CenterBulkyPickupQueue.tsx` / customer tracking copy for the "still searching, none nearby yet" state.
- Verification: confirm a rider ~20-50 km out is offered a trip when nobody is closer, a rider beyond 58 km is not, and that a van trip and a bike trip price at different per-km rates.
