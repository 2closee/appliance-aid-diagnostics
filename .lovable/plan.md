# Fix the partner portal link in approval emails

## The problem (confirmed)

`approve-repair-center-application` builds its links from the Supabase project URL:

```
supabaseUrl.replace('.supabase.co', '.lovable.app') + '/repair-center-admin'
```

That produces `https://esbqtuljvejvrzawsqgk.lovable.app/repair-center-admin` — a URL that is not this app at all (it is derived from the database project ref), which is why the page showed nothing useful and Lovable branding. The same wrong base is also used as the `redirectTo` for the password-reset email sent to existing users.

## What will change

1. **One shared app URL for all emails.** Add an `APP_URL` secret set to `https://fixbudi.lovable.app` and read it in the approval function instead of rewriting the Supabase URL.
2. **Point partners at the login page, not the internal dashboard route.** All buttons in the approval emails ("Access Your Portal" / "Go to Portal") will link to `https://fixbudi.lovable.app/partner-login`, the branded repair-center sign-in page with "Forgot password".
3. **Password-reset redirect fixed.** The reset email for existing partners will redirect to `https://fixbudi.lovable.app/reset-password`, where they set a new password and are then sent to the partner portal.
4. **Clean up other broken email links.** `send-job-notification` and `src/components/email-templates.ts` currently fall back to the literal string `https://n`; these will use the same `APP_URL` base.
5. No change to the partner portal itself — `/repair-center-admin` already bounces signed-out visitors to `/partner-login` and already forces a password change on first login.

## Domain requirement

Links will use `https://fixbudi.lovable.app`, which is live today — no DNS setup needed. `fixbudi.com` is not connected to this project yet; once you connect it in Project settings > Domains, switching every email link is a one-line change to the `APP_URL` secret, no code edit.

## Technical notes

- Files: `supabase/functions/approve-repair-center-application/index.ts`, `supabase/functions/send-job-notification/index.ts`, `src/components/email-templates.ts`.
- `APP_URL` is read via `Deno.env.get("APP_URL")` with a `https://fixbudi.lovable.app` fallback, so the domain can be changed later by editing the secret only.

