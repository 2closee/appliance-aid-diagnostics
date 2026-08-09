# Why rider verification emails aren't arriving — and how to fix it

## What I found

Rider signup goes through the normal account screen (`/auth`), which calls Supabase's built-in `signUp` with a redirect to `/verify-email`. That means the verification email is sent by **Supabase's own built-in email service**, not by any of the app's email functions.

Two things confirmed:

- This project has **no email sending domain configured**, so nothing in the app is set up to send branded/auth email itself.
- The app's Resend key is only used by custom functions (repair-center applications, job notifications, password reset). Signup verification does **not** go through Resend at all — it goes through Supabase's default built-in sender.

Supabase's default built-in sender is meant for development only. It has a very low hourly cap for the whole project (a couple of emails per hour), no dedicated sending reputation, and messages routinely land in spam or are silently dropped. Once the cap is hit, further signups get a rate-limit error and no email is sent. That matches "riders sign up and nothing arrives."

The signup code itself and the `/verify-email` route are correct — this is a mail delivery/configuration problem, not a bug in the form.

## The fix

Point Supabase Auth at a real sending service instead of the built-in default, using the Resend account already connected to this project.

1. **Custom SMTP for Auth** — in the Supabase dashboard, Authentication → Emails → SMTP settings, enable custom SMTP with Resend's SMTP host and the existing Resend API key as the password, and a sender address on a domain verified in Resend (e.g. `no-reply@fixbudi.com`). This immediately replaces the throttled default sender for every auth email: verification, password reset, magic link.
2. **Raise the auth email rate limit** — the default hourly cap stays low even after SMTP is switched. I'll raise it to a realistic signup volume so batches of riders don't get blocked.
3. **Verify the sending domain in Resend** — DNS records (SPF/DKIM) for the domain must be verified in Resend, otherwise Gmail and Outlook will spam-folder or reject the mail.

## App-side improvements I'll make in code

- **Clear rate-limit feedback on signup**: if Supabase returns an email rate-limit error, show riders a specific message ("too many verification emails just now, try again in a few minutes") instead of the raw error.
- **Resend-verification action on the rider path**: after signup, give riders a "Didn't get the email? Resend" button with a cooldown, so a lost email isn't a dead end.
- **Spam-folder hint** in the post-signup message and on the verification screen.

## Alternative worth considering

Riders already verify their **phone by SMS** (Termii) as part of the Ovapass application. Since riders are phone-first users, we could stop requiring email confirmation for riders entirely and treat the verified phone number as the trust signal — email confirmation would then only matter for repair-center staff and admins. This removes email delivery from the rider funnel completely. Say the word and I'll fold that into the work instead of, or alongside, the SMTP fix.

## Technical notes

- Sender switch and rate limit are Supabase Auth configuration, not code; I can apply the rate limit from here, but SMTP credentials must be entered in the Supabase dashboard (or I can walk you through it click by click).
- Code touched: `src/pages/Auth.tsx` (error mapping, resend action, spam hint) and `src/pages/EmailVerification.tsx` (resend + guidance).
- No database changes required.
