# Password reset + separate login entrances

## What changes

1. **Forgot password everywhere**
   - Add a "Forgot password?" link on the customer sign-in form (`/auth`).
   - Keep the existing repair-center reset dialog, moved onto the new partner login page.
   - Add a real `/reset-password` page (currently missing) where the user sets a new password after clicking the email link.

2. **Separate login entrances**
   - `/fixbudi-control` — admin sign-in page. Not linked anywhere in the site nav or footer. After sign-in, admins land on `/admin`; non-admins are told they lack access and signed out of that flow.
   - `/partner-login` — repair center sign-in (plus the existing "apply as repair center" tab). Linked from the site footer. After sign-in, centers land on `/repair-center-admin`.
   - `/auth` stays the regular customer login (email/password + Google), unchanged for users. Nav login button keeps pointing here.
   - `/repair-center-admin` keeps working: if a signed-out visitor hits it, they get redirected to `/partner-login`; the page itself becomes the dashboard only.

## Reset flow details

- Reset emails point to `${origin}/reset-password`, which is a public route.
- The page detects the recovery session, asks for a new password twice, calls the password update, then routes the user to the right home based on their role (admin → `/admin`, center staff → `/repair-center-admin`, else `/dashboard`).
- All three login pages (customer, partner, admin) use the same reset request path so any account type can recover.

## Technical notes

- Existing `send-password-reset` edge function is reused, but its hardcoded `redirectTo: https://fixbudi.com/repair-center-admin` is changed to accept a `redirectTo` from the caller (defaulting to `/reset-password`) so the link lands on the new page instead of auto-signing the user in.
- New files: `src/pages/ResetPassword.tsx`, `src/pages/PartnerLogin.tsx`, `src/pages/AdminLogin.tsx`, plus a small shared `ForgotPasswordDialog` component reused by all three login pages.
- `src/App.tsx`: add routes `/reset-password`, `/partner-login`, `/fixbudi-control`.
- `src/pages/RepairCenterAdmin.tsx`: strip the login/signup tabs and forgot-password dialog (they move to `PartnerLogin`), redirect unauthenticated visitors to `/partner-login`.
- `src/pages/Admin.tsx`: redirect unauthenticated visitors to `/fixbudi-control` instead of `/auth`.
- `src/pages/Auth.tsx`: add the forgot-password link/dialog.
- Footer on `src/pages/Index.tsx`: add a "Repair center login" link; no admin link anywhere.
- Security note: separate URLs are convenience/obscurity only — actual authorization still relies on the existing role checks (`useAuth` + `has_role`), which stay unchanged.
