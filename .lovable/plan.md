# Fix "no admin permission" on the admin login page

## What the data shows

Your account is still a super admin. In the database, `ibinaboloveday@gmail.com` (last sign-in today, not banned, email confirmed) has exactly one role row: `super_admin`. So nothing was lost — the login page is rejecting you incorrectly.

## Why the error appears

`/fixbudi-control` decides too early. Right after the password is accepted, the auth state fires and the page's loading flag flips to false, but the role lookup runs a moment later. At that instant the page still sees "not an admin", so it shows "This account does not have admin privileges" and signs you out — before the role has ever been read. It is a timing bug, not a permissions bug.

A second, related weakness: the role check asks for a single row matching either `admin` or `super_admin`. If an account ever holds both roles, that query errors and the user is treated as non-admin. Today only your account has an admin-type role, so this hasn't bitten yet, but it should be made safe.

## The fix

1. **Track when roles are known.** Add a "roles resolved" flag to the shared auth hook, set only after the role lookup finishes (and on sign-out). The admin login page waits for that flag before deciding anything — no more premature "access denied" or surprise sign-out.
2. **Make the admin lookup robust.** Query admin/super-admin rows as a list instead of expecting exactly one row, so holding both roles (or extra rows) can never turn an admin into a non-admin.

## Checking the same thing isn't happening to other account types

- **Customers (`/auth`)**: no role gate on sign-in, so this failure mode does not apply. Verified.
- **Repair centers (`/partner-login`)**: sign-in only waits for a session and then routes to the dashboard, so it does not falsely reject. `/repair-center-admin` does its own staff lookup after the session exists and shows a "not linked to a center" screen rather than signing you out. It will still get the same waiting treatment so a slow lookup never flashes a wrong state.
- **Existing partner accounts**: nothing about their stored roles/staff links changes — this is a frontend timing fix only.

## Verification

After the change: sign in at `/fixbudi-control` with the super admin email and confirm it lands on `/admin` with no denial toast, sign in as a repair center at `/partner-login` and confirm the dashboard loads, and confirm a non-admin account signing in at `/fixbudi-control` is still refused.

## Technical notes

- `src/hooks/useAuth.tsx`: add `rolesLoaded` (or equivalent) to the context, set `true` at the end of `checkUserRoles` and in `resetUserRoles`; switch the admin check from `.in([...]).maybeSingle()` to a list query with `data.length > 0`.
- `src/pages/AdminLogin.tsx`: gate the redirect/deny effect on `rolesLoaded`.
- `src/pages/RepairCenterAdmin.tsx`: gate its staff-state screens on the same readiness signal.
- No database migration and no role edits required.
