# Fix header overlap squeezing the FixBudi logo

## What's happening

The desktop header is a single row: logo on the left, then every nav item as a full text button ("Home", "AI Diagnostic", "Self-Test", "Repair Centers", "Schedule Pickup", "Ride with Ovapass", plus "Repair Center Portal" and "Sign In"). Adding "Ride with Ovapass" pushed the row past the container width. Because the logo link has no shrink protection, the flex row compresses it and the buttons visually crowd/overlap it.

## The fix (presentation only)

1. Protect the logo: make the logo link non-shrinking so it always keeps its full width and never gets squeezed by the nav row.
2. Let the nav row absorb the pressure instead: allow it to shrink, tighten button spacing/padding slightly, and prevent labels from wrapping.
3. Reduce desktop nav crowding so the row fits on common laptop widths:
   - Keep the primary items inline (Home, AI Diagnostic, Repair Centers, Schedule Pickup, Ride with Ovapass).
   - Move the lower-priority items (Self-Test, Payment History, and the admin-only links) into a compact "More" dropdown menu at the end of the row.
   - Show the full inline set only on extra-large screens; on medium-large screens more items collapse into "More".
4. Keep the mobile/tablet menu exactly as it is — all items stay listed there.

No changes to routes, auth logic, or navigation behavior — only layout and grouping.

## Technical notes

- File: `src/components/Navigation.tsx`.
- Add `shrink-0` to the logo `Link`; add `min-w-0` and tighter `gap` to the desktop nav container, `whitespace-nowrap` on button labels.
- Split `navItems` into `primaryItems` and `overflowItems`; render overflow via the existing shadcn `DropdownMenu` component.
