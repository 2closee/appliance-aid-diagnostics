# Fix "could not send a code right now" on rider OTP

## What the logs actually show

Termii is rejecting every send with a validation error on the `from` field:

```text
"field":"from","message":"size must be between 0 and 32",
"rejectedValue":"019fe232-4f37-72f4-bedc-8ef7cc6f4811"
```

The value stored in the `TERMII_SENDER_ID` secret is the UUID Termii shows next to the sender ID in the dashboard, not the approved sender name itself (e.g. `FixBudi`). Termii expects the sender name string. So the approval is fine — the wrong value is being sent.

## Fix

1. Replace the `TERMII_SENDER_ID` secret with the approved sender name exactly as it appears in the Termii Sender ID list (alphanumeric, max 11 characters, e.g. `FixBudi`). I will open the secret prompt for you to paste it.
2. Add a guard in the Termii adapter: reject a sender ID that looks like a UUID or exceeds 11 characters before calling Termii, and log a clear message ("TERMII_SENDER_ID looks like a dashboard UUID, use the approved sender name") so this misconfiguration is obvious instead of surfacing as a generic failure.
3. Surface the real reason to admins: `sms-health` will report the configured sender ID and flag it as invalid when it fails the same shape check, so the Ovapass admin screen shows the problem without digging into logs.
4. Verify by sending a live code to your Nigerian number and confirming a `termii ok` result in the function logs.

## Technical details

- `supabase/functions/_shared/sms/termii.ts`: add `isValidSenderId()` (3-11 chars, `[A-Za-z0-9 _-]`, not a UUID); `isConfigured()` returns false when the sender ID fails it, so the dispatcher can fall through to Twilio if it is ever configured, instead of hard-failing.
- `supabase/functions/sms-health/index.ts`: include `sender_id_valid` in the response alongside the existing balance check.
- No database or frontend changes needed; the user-facing error text in `PhoneVerificationField` stays as is since it is only shown when sending genuinely fails.
