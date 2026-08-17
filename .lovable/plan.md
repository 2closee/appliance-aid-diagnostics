# Fix: approved center still sees "Access Pending"

## What's actually wrong

MERANOS FIXGADGET is fully approved in the database:

- Center id 46, status `active`
- Owner staff record `is_active: true`, role `owner`, email confirmed

So approval worked. The portal page is what's broken.

`/repair-center-admin` loads the staff record with an invalid nested query
(`repair_center:repair_center_id("Repair Center"(*))`). I ran that exact query
against the API and it fails:

```text
PGRST200 — Could not find a relationship between 'Repair Center' and 'Repair Center'
```

Because the request errors, the page sees no staff record and falls through to the
"Access Pending" screen — for every approved partner, not just this one. The
correct embed (`"Repair Center"(*)`) returns successfully.

## The fix

1. `src/pages/RepairCenterAdmin.tsx` — replace the broken embed in both places
   (initial staff check and the post-password-change re-check) with a valid
   embed, aliased so `repairCenterInfo.repair_center` keeps working.
2. Same broken embed exists in `src/components/dashboard/AdminDashboard.tsx` —
   fix it there too so the admin view of staff isn't silently empty.
3. Make the portal fail loudly instead of silently: if the staff lookup returns
   an error, show a retry message rather than the "Access Pending" screen, so a
   future query break can't masquerade as a pending approval.

## Verification

- Re-run the corrected query against the API and confirm it returns rows.
- Sign in as the center owner in the preview and confirm the portal renders the
  dashboard (name, address, phone, role, Staff Management tab) instead of
  "Access Pending".

No database or migration changes are needed — the data is already correct.
