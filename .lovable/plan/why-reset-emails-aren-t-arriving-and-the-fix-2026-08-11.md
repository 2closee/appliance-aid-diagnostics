# Why reset emails aren't arriving — and the fix

## What the logs show

The reset requests are reaching the backend, but no email is ever sent. The two attempts made this morning (11:31 and 11:37, both for `meranosfixgadget@gmail.com`) ended with "User not found, but returning success for security" — so the function stopped before sending, yet the app still showed "check your email".

That address has no account in the system. The 11 existing accounts are all lowercase addresses such as `dementorworldtech@gmail.com`, `harrydeeglobal@gmail.com`, `ashamanny75@gmail.com`.

So there are two separate problems:

1. **The account being tested doesn't exist** (or was registered under a different address), so nothing can be sent. Right now the app hides this and shows a success message, which makes it look like delivery is broken.
2. **Real bugs in the lookup** that will silently swallow legitimate requests:
   - The email comparison is exact and case-sensitive. A center that signed up as `Harrydeeglobal@gmail.com` and types it with a capital letter is treated as "user not found".
   - Only the first page of accounts is scanned (50 by default), so once the user base grows past that, older accounts stop being found.
   - Nothing is recorded when a request ends in "user not found", so these failures are invisible in the email log.

Email sending itself is healthy — other emails to Gmail addresses were delivered as recently as today.

## What changes

**Backend (`send-password-reset`)**
- Look the account up case-insensitively and trimmed, instead of exact string match.
- Page through all accounts (or look the address up directly) so no account is missed as the user base grows.
- Log a `password_reset` row with status `skipped_no_account` when no account matches, so unsent requests are visible in the email log instead of vanishing.
- Log a `password_reset` row on success too (already partly there) so delivery can be traced by Resend ID.

**Frontend (`ForgotPasswordDialog`)**
- Keep the neutral "if an account exists…" wording (correct for security), but add a short hint: reset links only work for the address the account was created with, and to check spam.
- Keep the existing fallback to Supabase's own recovery email if the branded send fails.

## Also worth confirming (no code change)

Repair centers who were created by an admin/approval flow may be under a different email than the one being tested. Once the fix is in, requesting a reset for `dementorworldtech@gmail.com` (a known account) will confirm end-to-end delivery.

## Technical notes

- Files touched: `supabase/functions/send-password-reset/index.ts`, `src/components/ForgotPasswordDialog.tsx`.
- No database migration needed; `email_logs` already has the columns used.
- The function is redeployed after the edit.
