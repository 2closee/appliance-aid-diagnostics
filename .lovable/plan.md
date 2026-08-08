# Make Ovapass rider signup visible in FixBudi

The rider signup already exists at `/rider/signup`, but nothing on the FixBudi site links to it, so third-party riders (people using their own bikes) can't find it. This plan adds a public front door for Ovapass.

## What gets built

**1. Public Ovapass landing page (`/ovapass`)**
Marketing page aimed at third-party riders, sharable on WhatsApp/Facebook:
- Hero: "Ride with Ovapass — deliver for FixBudi" with a prominent "Register as a rider" button.
- How it works: register and upload documents, get verified, go online, accept pickups near you, get paid per trip.
- What you need: own bike (or apply for a FixBudi e-bike), smartphone, government ID, guarantor.
- Earnings explainer: paid per completed trip, cash collected on delivery, weekly settlement, earnings visible in-app.
- FAQ + closing "Apply now" CTA.
- Open Graph / Twitter meta tags so shared links show a proper preview card, matching the `/join` page pattern.

**2. Entry points so it's actually discoverable**
- Navigation: "Ride with Ovapass" item for logged-out visitors and customers (hidden for repair center staff/admins).
- Home page footer: link alongside the existing partner links.
- Anyone already registered as a rider gets a link to their rider dashboard instead of the signup form.

**3. Signup flow polish**
- Visiting `/rider/signup` while signed out sends the user to sign in first, then straight back to the form (currently it just bounces to `/auth`).
- Default the "whose bike" choice to third-party ("My own bike") and label the two options clearly: third-party rider vs FixBudi e-bike rider.
- If someone who already applied opens the form, show their application status (pending review / approved / rejected) instead of a blank form.
- After submitting, land on a clear "application received, we'll review within 24–48 hours" state.

**4. Rider-aware dashboard routing**
`/dashboard` currently falls through to the customer view for riders. Riders get routed to the Ovapass rider home so they don't land in the wrong place.

## On migrating Ovapass to its own app later

Nothing here blocks that. The rider flow already runs entirely through the `overpass-*` edge functions and rider-scoped tables, so a future standalone Ovapass app would talk to the same backend as an API client — the pages built now are just the FixBudi-hosted client. No new API surface is needed for that until you actually split the apps.

## Technical notes

- New file `src/pages/Ovapass.tsx`; route registered in `src/App.tsx`.
- Reuses existing `riders` table, `rider-kyc` bucket, and `useRider` hook — no database changes.
- Meta tags via `react-helmet-async` (already installed and used by `/join`).
- Nav additions in `src/components/Navigation.tsx`; rider case added to `src/pages/Dashboard.tsx`.
- All colors via existing design tokens; page is mobile-first since riders sign up on phones.
