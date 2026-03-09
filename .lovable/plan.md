

## Root Cause

The `send-confirmation-email` edge function returns **404 Not Found** when called. The function code exists locally but is not deployed to the Supabase project.

## Fix

Deploy the `send-confirmation-email` edge function. No code changes are needed — just a deployment.

### Steps
1. Deploy `send-confirmation-email` edge function using the deploy tool
2. Verify it responds correctly after deployment

### Additional Notes
- The function uses `RESEND_API_KEY` which is already configured in secrets
- The `from` address is `noreply@fixbudi.com` — this requires the `fixbudi.com` domain to be verified in Resend. If emails still fail after deployment, the domain verification in Resend should be checked.
- `verify_jwt = false` is already set in config.toml, so no auth issues expected

