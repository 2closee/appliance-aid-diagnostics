# Replace splash spinner with a "pop" logo animation

## Goal
Remove the rotating circular spinner from the loading/splash screen. Instead, make the Fixbudi logo itself gently "pop in and pop out" (scale up and back down) in a continuous loop while the app loads.

## File to change
`index.html` — the splash screen markup + inline `<style>` (lines 105–141).

## What changes
1. **Remove** the rotating circle `<div>` (the element with `border`, `border-radius: 50%`, and `animation: spin 1s linear infinite`).
2. **Animate the logo** instead. Give the `<img>` its own continuous "pop" animation, e.g.:
   - `@keyframes pop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }`
   - `animation: pop 1.4s ease-in-out infinite;`
   - Add a subtle opacity fade so it reads as "popping in/out" rather than just zooming: `opacity` dips slightly at the small end.
3. **Keep the logo visible** at its natural size (drop the `margin-bottom: 20px` since the spinner below it is gone).
4. **Preserve dark-mode handling**: keep the `prefers-color-scheme: dark` rule that switches the splash background to `#0a0a0a`. The logo image stays the same (current splash already uses `fixbudi-logo-light.webp` in both modes).
5. Leave everything else untouched — `removeSplashScreen` in `src/main.tsx` already fades the splash out and removes it once the app loads, so no JS change is needed.

## Out of scope
- No changes to `src/main.tsx` removal logic, the favicon theme script, or app routing.

## Verification
- Reload the preview and confirm: no rotating circle; the logo repeatedly pops in/out; splash fades away once the app is ready; looks correct in both light and dark mode.
