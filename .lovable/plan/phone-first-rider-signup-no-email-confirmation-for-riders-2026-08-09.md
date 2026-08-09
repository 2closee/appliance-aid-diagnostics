# Phone-first rider signup — no email confirmation for riders

Riders stop depending on email entirely. A rider proves who they are with the SMS code they already receive during the Ovapass application, and that verified phone number becomes the trust signal. Email confirmation stays required for customers, repair-center staff and admins.

## New rider signup flow

```text
/rider/signup  ->  enter phone  ->  SMS code  ->  code verified
               ->  enter name + email + password
               ->  account created already-confirmed  ->  signed in
               ->  continue with bike details + KYC documents  ->  submit
```

- The phone step comes **first**, before an account exists. No SMS is spent until the rider commits to the flow (existing rate limits and 60-second resend cooldown still apply).
- Email and password are still collected — riders need a way to sign back in and we need a contact address on file — but the inbox is never on the critical path. No verification link, no "check your email", no dead end if the mail never lands.
- The rider is signed in immediately after the account is created and lands straight in the rest of the application form.
- A rider who already has an account just signs in as today and goes through the phone step inside the form (as it works now).

## What changes for other users

Nothing. Customers and repair-center staff keep the current email-confirmation signup at `/auth`. This change is scoped to the rider path only, so we are not weakening confirmation for the whole app.

## Why this fixes the problem

The undelivered mail was Supabase's built-in development sender, which is heavily throttled and frequently spam-filtered. Taking riders off email confirmation removes that sender from the rider funnel completely, so rider onboarding no longer depends on mail delivery at all.

Worth noting separately: customer and staff signups still use that same throttled sender. If you want those fixed too, the answer is pointing Supabase Auth at a real sending service (Resend, which is already connected) — say the word and I'll plan that as follow-up work.

## Technical details

- New edge function `rider-signup` (service role, `verify_jwt = false`):
  - Requires proof that the submitted phone was verified — it checks the `phone_verifications` row is consumed, unexpired and matches the phone, so nobody can create a confirmed account without passing SMS.
  - Creates the auth user with `email_confirm: true` via the admin API, sets `phone` and `phone_verified_at` on the profile, and returns a session for the client to set.
  - Validates input with Zod; rejects an email that already exists with a clear "sign in instead" message.
- `supabase/functions/verify-phone-otp` gains support for verifying a phone with **no signed-in user** (pre-account), keeping the current authenticated behaviour intact.
- `src/components/PhoneVerificationField.tsx` gains an anonymous mode so it works before sign-in.
- `src/pages/rider/OvapassRiderSignup.tsx` becomes two steps: phone verification + account creation for signed-out visitors, then the existing details/KYC form. The current redirect to `/auth` for signed-out riders is removed.
- `src/pages/Ovapass.tsx` rider CTA points at `/rider/signup` directly.
- No schema changes needed — `phone_verifications`, `profiles.phone_verified_at` and `riders.phone_verified_at` already exist.
- No Supabase dashboard configuration required.

## Order of work

1. Extend `verify-phone-otp` for pre-account verification, add the `rider-signup` function.
2. Anonymous mode on the phone verification component.
3. Rebuild rider signup as phone-first two-step, remove the sign-in gate.
4. Check the CTA path end to end from the Ovapass page.
