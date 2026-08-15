# Role-Tailored Dashboards + App Back Button

## Goal

1. After login, each user type sees only the navigation and dashboard features meant for them: customers, repair centers, riders (and admins).
2. When the app is installed to the home screen (standalone mode), a back icon appears on every page so users don't have to swipe.

## Part 1 — Role-tailored navigation and dashboards

Today the top navigation builds its menu from `userRole` (`admin` / `repair_center` / `customer`), and riders are treated as customers, so a signed-in rider still sees AI Diagnostic, Self-Test, Repair Centers, Schedule Pickup, Payment History, etc. The rider home page shows no app navigation at all.

Changes:

- **Add a rider role.** Detect an approved rider record during the existing role lookup and expose `isRider` plus `userRole: 'rider'`. Riders keep customer data access, but the UI treats them as riders for navigation.
- **Define one menu per role** in the navigation component:
  - Customer: Home, Dashboard, AI Diagnostic, Self-Test, Repair Centers, Schedule Pickup, Payment History, Conversations, Ride with Ovapass.
  - Repair center: Dashboard, Repair Jobs, Bulky Pickups, Conversations, Center Earnings, Settings/Staff.
  - Rider: Dashboard (rider home), Earnings, Support. No diagnostic, repair-center browsing, pickup scheduling, or payment-history entries.
  - Admin: unchanged (Super Admin, Strategic Planning, Payout Management, plus admin pages).
  - Signed out: current public marketing menu.
- Apply the same filtered list to the desktop bar, the "More" dropdown, and the mobile menu, so nothing role-irrelevant leaks into either surface.
- **Add the shared navigation header to the rider pages** (`/rider`, `/rider/earnings`) using the rider menu, so riders get consistent chrome.
- **Dashboard routing:** `/dashboard` already redirects riders to `/rider`; keep that and make it use the new rider flag instead of its own query. Each dashboard component keeps its own cards; we only remove cross-role links that don't belong (e.g. no customer diagnostic shortcuts on the repair-center dashboard).

No changes to permissions, RLS, or business logic — this is navigation/presentation only. Existing database role checks stay authoritative.

## Part 2 — Back button for the installed app

- Add a small `AppBackButton` component: an icon-only chevron/arrow button, no text.
- Render it globally (once, in the app shell) so it appears on every page.
- Visible only when the app runs as an installed app — standalone display mode (`display-mode: standalone` / iOS `navigator.standalone`) — so the browser experience keeps its native back button and stays uncluttered.
- Hidden on the home page (`/`) since there is nowhere to go back to.
- Behavior: go back in history when there is history to go back to; otherwise navigate to the user's home surface (`/dashboard` when signed in, `/` when not), so a deep-linked page never leaves the user stuck.
- Placement: fixed top-left inside the safe-area inset, aligned with the existing header height, with a subtle rounded background so it reads as an app control on both light and dark themes.

## Technical notes

- Rider detection lives in `src/hooks/useAuth.tsx` alongside the existing admin/staff lookups, so it resolves before pages decide what to render (uses the existing `rolesLoaded` guard).
- `userRole` type widens to include `'rider'`; anywhere that compares against `'customer'` for customer-only UI gets checked and updated (navigation, conversation notifications, dashboards).
- The role → menu mapping becomes a single data structure in `src/components/Navigation.tsx` to avoid the current scattered conditionals.
- `AppBackButton` is mounted in `src/App.tsx` inside the router, uses `useNavigate`/`useLocation`, and listens for display-mode changes so it appears without a reload.
- Colors use existing semantic tokens; no hardcoded color utilities.
