# Phone verification by SMS + one-click Google sign-in

Two additions: riders and customers verify the phone number they register with via a 6-digit SMS code, and anyone signing up as a customer or rider can do it with a single "Continue with Google" button.

## Recommended SMS provider: Termii (with Twilio as fallback)

For Port Harcourt numbers Termii is the better primary: it is Nigeria-focused, routes locally with DND-aware delivery, and costs roughly 3-4x less per SMS than Twilio. Twilio stays as an optional failover so verification never blocks a rider signup if Termii has an outage.

You will need from Termii (termii.com): an API key and an approved sender ID. Nothing else. Twilio failover is only wired if you want it later.

## Phone verification flow

```text
rider/customer enters phone -> "Send code" -> SMS with 6 digits (10 min expiry)
   -> enters code -> verified stamp saved -> can finish signup / go online
```

- Codes are 6 digits, expire after 10 minutes, max 5 wrong attempts, and a resend cooldown of 60 seconds per phone number.
- Only the hash of the code is stored, never the code itself.
- A rider cannot submit their KYC application until their phone shows verified. Admin sees a "phone verified" badge in the Ovapass fleet screen.
- Customers verify from their profile and during pickup requests, so the delivery rider always has a reachable number.
- Rate limits: 5 codes per phone per hour, 20 per IP per hour, so nobody can burn your SMS credit.

### Where it appears
- `/rider/signup` — phone field gains a "Verify" button and a code input; submit stays disabled until verified.
- Customer profile / pickup request — same small verification component, reused.
- Ovapass admin fleet list — verified/unverified indicator per rider.

## One-click Google sign-in

- "Continue with Google" button on the sign-in and sign-up screens, above the email form.
- Shown to customers and riders. Repair-center staff keep email + password, since admin onboards them — the staff portal entry point stays as it is.
- New Google users get a profile row automatically (existing signup trigger already handles this) and land on their dashboard; a Google user who already has a rider profile goes to the rider dashboard.
- Google accounts arrive with a verified email but no phone, so the phone verification step above still applies to riders.

This needs a Google Cloud OAuth client and the Google provider enabled in your Supabase dashboard — I will give you the exact click-by-click steps and the redirect URLs to paste, since that part happens in your Google and Supabase consoles, not in code.

## Technical details

- New table `phone_verifications`: phone (normalised to +234 E.164), code hash, expiry, attempt count, consumed flag, optional user id. RLS locked down so only edge functions read it.
- `profiles` gains `phone`, `phone_verified_at`; `riders.phone_verified_at` added so dispatch can require a verified number.
- Two edge functions: `send-phone-otp` (validates and normalises the number, rate limits, generates the code, sends via Termii) and `verify-phone-otp` (constant-time compare, marks the phone verified on the profile and rider row).
- Shared SMS adapter at `supabase/functions/_shared/sms/termii.ts` mirroring the existing logistics adapter pattern, so a Twilio adapter can be dropped in beside it.
- Reusable `PhoneVerificationField` component so rider signup, customer profile, and pickup request share one implementation.
- Google auth via `supabase.auth.signInWithOAuth({ provider: 'google' })` with `redirectTo` set to the current origin; `useAuth` already picks up the session from `onAuthStateChange`.

## Order of work

1. Database changes (verification table + phone columns).
2. Termii adapter and the two edge functions — I will ask for the Termii API key and sender ID at this point.
3. Phone verification UI wired into rider signup first, then customer surfaces.
4. Google sign-in button, with the console setup steps for you to follow.
