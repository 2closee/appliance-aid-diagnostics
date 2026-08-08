# Rename "Overpass" to "Ovapass"

The rider platform is currently named "Overpass" throughout the app. This corrects it to **Ovapass** everywhere users can see it, and renames the code to match.

## What changes for users

- Every visible mention of "Overpass" becomes "Ovapass": rider signup page, rider home/dashboard, earnings page, the admin fleet page, the "Request rider" panel on job pages, and the Admin navigation link.
- Toast messages, headings, buttons, and empty-state copy that say "Overpass" are updated.

Nothing about how the feature works changes — only the name.

## Code rename (technical)

Files renamed:

```text
src/pages/rider/OverpassRiderSignup.tsx    -> OvapassRiderSignup.tsx
src/pages/rider/OverpassRiderHome.tsx      -> OvapassRiderHome.tsx
src/pages/rider/OverpassRiderEarnings.tsx  -> OvapassRiderEarnings.tsx
src/pages/admin/OverpassAdmin.tsx          -> OvapassAdmin.tsx
src/components/overpass/RequestOverpassRider.tsx -> src/components/ovapass/RequestOvapassRider.tsx
```

Also updated:

- `src/App.tsx` — imports plus the admin route `/admin/overpass` becomes `/admin/ovapass`.
- `src/pages/Admin.tsx` — nav label and link target.
- `src/pages/RepairJobDetail.tsx` — component import/usage.
- `src/hooks/useRider.ts` — comments and any local naming; table names untouched.

The rider-facing routes `/rider`, `/rider/signup`, `/rider/earnings` already carry no brand name and stay as-is.

## What is intentionally left alone

Database tables (`overpass_trips`, `overpass_pricing`) and edge function slugs (`overpass-create-trip`, `overpass-assign`, `overpass-respond-offer`, `overpass-trip-status`, `_shared/overpass/*`) keep their current names. They are internal identifiers no user sees, and renaming them means a data migration plus redeploying every function — real breakage risk for zero user-visible gain. Say the word if you want these renamed too and I will do it as a separate, careful step.

## Verification

Search the project for any remaining "Overpass" outside the database/edge-function names, and load the rider signup, rider home, admin fleet, and a job detail page to confirm the new name renders and nothing errors.
