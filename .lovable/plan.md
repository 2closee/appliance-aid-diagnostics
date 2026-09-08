# Guest Bottom Navigation and Back Button Cleanup

## Goal
Give signed-out users the same native-style bottom navigation as signed-in users, and remove the extra custom back icon that duplicates other back controls in the installed app.

## Changes
- Add a five-position mobile bottom bar for signed-out users:
  - Home
  - Diagnose
  - Repair Centers
  - Sign in
  - Menu
- Move the remaining public links into the Menu sheet, including Phone Self-Test, Schedule Pickup, Ovapass, Blog, and the repair-center portal.
- Remove the mobile top-right Sign in and Menu controls so navigation is not duplicated.
- Keep the centered FixBudi logo in the top bar and preserve the existing desktop navigation.
- Remove the globally mounted custom installed-app back button so the PWA no longer shows multiple back icons.
- Preserve safe-area spacing, active states, theme switching, and all existing routes and sign-in behavior.

## Verification
- Check signed-out mobile browser and installed-display layouts.
- Confirm all five bottom actions work and every former guest-menu destination remains reachable.
- Confirm the custom floating back icon no longer appears on any page.
- Confirm signed-in role-specific bottom navigation and desktop navigation are unchanged.
