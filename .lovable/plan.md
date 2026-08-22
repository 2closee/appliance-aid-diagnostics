# Vehicle-aware Ovapass dispatch (fleet bikes + third-party vehicles)

## What is happening now (verified)

- Your live test job (TV, bulky, quote accepted) has an Ovapass trip created on 18 Aug that is still `searching` with **0 assignment attempts** and **0 offers ever created** — so no rider was ever notified for it.
- There is exactly one rider in the system: a `partner` (third-party) rider, KYC approved, online, with a fresh location about 1.5 km from the pickup. Under the current code they would now be eligible, but the trip has never been retried since creation, so the offer was never made.
- Riders currently record only `fleet_type` (`company` = FixBudi e-bike, `partner` = own bike). There is **no vehicle class anywhere** — dispatch cannot tell a bike from a van, so a TV pickup could be offered to an e-bike rider.
- Item categories exist (`gadget` vs `bulky`) and are already stored on the repair job, but dispatch ignores the category when picking a rider.

## What to build

### 1. Rider vehicle capability
- Add a vehicle class to riders: `bike`, `car`, `suv`, `van`, `truck` (plus optional make/model/plate already captured), and derive a capability from it:
  - bike → gadgets only (phones, laptops, computers)
  - car / suv → gadgets (and small bulky only if explicitly allowed by admin)
  - van / truck → bulky (TV, AC, washing machine, fridge) **and** gadgets
- Keep `fleet_type` for ownership/settlement (FixBudi bike vs third-party) and use vehicle class purely for what a rider is allowed to carry. The two are independent.
- Backfill existing riders as `bike` so nothing silently becomes bulky-capable; admin can upgrade.

### 2. Registration aligned to the categories
- Rewrite the Ovapass signup step to ask, in this order: "What will you deliver?" (Gadgets only / Bulky appliances / Both) → vehicle type → ownership (FixBudi e-bike vs my own vehicle).
- Selecting bulky requires a vehicle type of van/truck (or car/SUV where admin allows), and the document upload labels change accordingly ("photo of your vehicle" instead of "photo of your bike").
- Bulky applicants additionally supply plate number and vehicle papers; the review queue shows the requested capability so approval is an explicit decision.
- Admin Ovapass rider table gains vehicle class + capability columns and lets an admin correct them.

### 3. Dispatch filtered by package category
- Trip creation records the required capability from the job's logistics category (`bulky` vs `gadget`).
- Nearest-rider ranking filters candidates to riders whose approved vehicle can carry that category, then orders by distance as today. Ovapass fleet riders are preferred first for gadgets; third-party riders in range are used when no fleet rider qualifies or is available. Bulky goes only to approved bulky-capable vehicles, fleet or third-party alike.
- When nothing qualifies, the trip stays `searching` with an honest reason ("no bulky-capable vehicle online nearby") surfaced on the repair center card, instead of appearing dispatched.

### 4. Make offers actually reach riders
- Auto-dispatch on quote acceptance: when a customer accepts a quote, the pickup trip is created/dispatched instead of waiting for a manual button (manual request stays as a fallback).
- Retry stalled `searching` trips whenever a qualifying rider comes online, refreshes location, or changes availability, and on a periodic sweep so a trip cannot sit unassigned for days.
- Keep the existing rider alerting (in-app notification + chime + SMS fallback) and confirm it fires for the retried offer.
- Rescue the current test trip so it is offered to the correct rider type once capabilities are set.

## Technical scope

- One migration: `vehicle_class` and `carry_capability` columns (with check constraints and safe defaults) on `riders`, an optional `required_capability` column on `overpass_trips`, backfill, and no change to existing RLS boundaries.
- Edge functions: `_shared/overpass/assign.ts` (capability filter, fleet-first ordering, truthful no-candidate reason), `overpass-create-trip` (stamp required capability), `overpass-assign` (retry sweep), plus a hook from quote acceptance (`respond-to-quote`) into trip creation.
- Frontend: `OvapassRiderSignup.tsx` (category-first flow, vehicle wording/docs), `admin/OvapassAdmin.tsx` (vehicle columns + edit), `useRider.ts` (retry on online/location refresh), `RequestOvapassRider.tsx` / `CenterBulkyPickupQueue.tsx` (accurate waiting state).
- Verification: confirm the bulky test trip is offered only to a bulky-capable rider, that a gadget trip reaches a bike rider, and that the rider receives notification + SMS.
