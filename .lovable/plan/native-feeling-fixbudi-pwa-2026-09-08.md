# Native-feeling FixBudi PWA

## Goal
Turn the installed FixBudi experience into the selected **Native Neo-minimalist** direction while preserving the existing black, white, gray, green-status, and orange-urgent palette and every current customer, repair-center, rider, and admin workflow.

The public website will remain useful for visitors. Signed-in and installed users will get the app-like experience.

## What will change

### 1. Create one reusable mobile app shell
- Replace the mobile hamburger-first layout with a compact FixBudi top bar and a fixed, safe-area-aware bottom navigation.
- Use five role-specific primary destinations, plus a **More** sheet for lower-frequency features so nothing becomes inaccessible.
- Keep unread badges, notification access, theme controls, sign out, and the installed-app back action.
- Use `100dvh`, device safe areas, 44px touch targets, fixed navigation dimensions, and keyboard-aware spacing.
- Keep the current desktop navigation for wider screens while bringing its typography and spacing into the same visual system.

### 2. Apply the selected visual direction
- Preserve the existing semantic colors: near-black primary surfaces, crisp white/light-gray backgrounds, orange for urgent action, green for successful/healthy states, and the current dark theme.
- Use the existing FixBudi logo rather than a replacement mark or fake phone status bar.
- Use strong compact headings, short supporting text, restrained 8px cards, subtle borders/shadows, and no decorative gradients or oversized marketing sections inside the app.
- Add quick press feedback and short page/content transitions, with reduced-motion support.

### 3. Redesign each role’s home screen without changing its logic
- **Customer:** prominent Start Diagnosis action, urgent quote/payment alert, active repair status, quick access to repair centers and pickup, conversations, repair history, and notifications.
- **Repair center:** online/offline status, urgent quote requests, current jobs, conversations, bulky pickup queue, earnings/payout, settings, referral tools, and protection work.
- **Rider:** online control, new-offer countdown, active trip/map and OTP steps, earnings, trip totals, notifications, and support.
- **Admin:** concise platform health summary, urgent operational items, recent jobs, repair-center management, analytics, payouts, logistics, protection, blog controls, and notifications.
- Keep all existing forms, live updates, payments, maps, dialogs, permissions, and database behavior unchanged.

### 4. Improve installed-app behavior
- Update the manifest so launches enter the authenticated app flow and add useful app shortcuts while preserving the existing icon, name, theme, and standalone display.
- Keep Firebase Messaging as the notification worker and do not reintroduce the removed app-shell cache worker.
- Correct install messaging so it promises home-screen access and notifications, not offline support that the current app does not provide.
- Preserve deep links from notifications, email links, and shared URLs.

## Technical approach
- Add focused shared pieces for the app header, role-aware bottom tabs, overflow sheet, and mobile page container rather than duplicating navigation in every dashboard.
- Reuse the existing role resolution and route structure; each tab list will be derived from the same role-aware navigation source.
- Extend the existing semantic design tokens and utilities; page code will not contain raw color values.
- Keep public/marketing routes visually separate from authenticated app routes, while using the new shell on operational pages.

## Verification
- Test customer, repair-center, rider, and admin navigation paths, including unread badges and overflow destinations.
- Test Android and iPhone-sized viewports, standalone display simulation, safe areas, scrolling, keyboard/form screens, dark mode, and desktop layouts.
- Verify diagnosis, quote/payment actions, conversations, pickup dispatch, rider trip controls, maps, settings, and admin tabs still work.
- Confirm the manifest and install prompt are valid, Firebase push registration remains on `/firebase-messaging-sw.js`, and no old cache worker takes control.
- Resolve all build/runtime errors and visually compare the finished mobile dashboard against the selected sample.

## Scope note
This redesign makes the web app feel native when installed; it does not convert FixBudi into an App Store/Play Store binary or add offline caching.
