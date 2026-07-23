# Kwik Delivery API — Analysis & Next Steps

## What the API expects

The Kwik API is **vendor-authenticated**, not API-key based. Every request needs two values you can only obtain by registering a Kwik business (vendor) account:

- `access_token` — returned by `POST /vendor_login` with your Kwik email + password
- `vendor_id` — your Kwik business account ID (also returned by login)

Base URLs:
- Staging: `https://staging-api-test.kwik.delivery/`
- Production: `https://api.kwik.delivery/` (confirmed during onboarding)

Core endpoints we'll use for FixBudi:
1. `POST /vendor_login` — obtain `access_token` + `vendor_id`
2. `GET /getVehicle` — list vehicle types (we'll pick bike/scooter for gadgets)
3. `POST /send_payment_for_task` (or `/getPricing`) — quote before dispatch
4. `POST /v2/create_task_via_vendor` — create pickup + delivery task (supports `has_return_task` for two-leg gadget flow, `ref_images` for photo proof, `template_data` for OTP/instructions)
5. `POST /cancel_vendor_task` — cancel
6. Webhook — task status callbacks (UPCOMING → STARTED → ARRIVED → ENDED/FAILED)

## What you need to do next (action required from you)

**1. Sign up for a Kwik business/vendor account** — Kwik does not self-serve API keys. You must register as a business and request API access.

- Business signup: **https://kwik.delivery/business** (or "Business Signup" / "Kwik for Business" from https://kwik.delivery)
- Nigeria business portal: **https://business.kwik.delivery/register**
- After signup, email **support@kwik.delivery** (or your onboarding contact) and request:
  - API access for production + staging
  - Your `vendor_id`
  - Confirmation of the production base URL
  - Webhook registration for task status updates
  - Coverage confirmation for **Port Harcourt** (Kwik's strong zones are Lagos/Abuja — PH coverage should be verified before we go live there)

**2. Once approved, share these credentials via `add_secret`:**
- `KWIK_VENDOR_EMAIL`
- `KWIK_VENDOR_PASSWORD` (used only server-side to mint `access_token`)
- `KWIK_VENDOR_ID`
- `KWIK_API_BASE` (staging first, then swap to production)

I will not ask for them until you confirm the account is approved.

## What I'll build once credentials arrive

Wire the existing `supabase/functions/_shared/logistics/kwik.ts` scaffold to real endpoints:

1. **Token manager** — login on cold start, cache `access_token` in memory, refresh on 401.
2. **`getQuote`** — call Kwik pricing with pickup/delivery lat-lng, `vehicle_id` for bike, return normalized `LogisticsQuote`.
3. **`createDelivery`** — call `/v2/create_task_via_vendor` with:
   - `has_return_task: 1` when `delivery_type === 'return'` is expected later
   - `ref_images` populated from our `delivery-condition-photos` bucket
   - `template_data` carrying our 4-digit `pickup_otp` / `return_otp` as a custom field the rider sees
   - Handle-with-care flag in `delivery_instructions`
4. **`cancelDelivery`** — call `/cancel_vendor_task`.
5. **Webhook** — new edge function `kwik-webhook` (verify_jwt = false) that maps Kwik `job_status` (0/1/2/3/4/6/7/8) to our `delivery_status_history`.
6. **Dispatcher** — Kwik becomes the primary provider for `logistics_category = 'gadget'` in Port Harcourt; Terminal Africa remains failover. Bulky items continue to skip API dispatch.
7. **Config** — set `verify_jwt = false` for `kwik-webhook` in `supabase/config.toml`.

## Technical notes

- Kwik tokens are long-lived per session; storing in module scope inside the edge function is enough (Deno isolates recycle, so we handle the 401 refresh path).
- Kwik expects lat/lng — we already collect these via Mapbox in `verify-address`, so no new geocoding work.
- Kwik's `ref_images` accepts public URLs — our condition photos live in a private bucket, so we'll generate signed URLs at dispatch time.
- Two-leg gadget flow (pickup → repair center → return) is best modeled as **two separate Kwik tasks** rather than one task with `has_return_task`, because the return leg is scheduled days later after repair completes. Our existing `delivery_type` column already handles this.

## Recommended immediate action

Register at **https://kwik.delivery/business** today, request API + Port Harcourt coverage, and reply here with the approval email. I'll then request the four secrets and ship the live wiring in one pass.
