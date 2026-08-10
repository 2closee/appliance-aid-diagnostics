# Simplify splash: white background, centered icon, no text

## Goal
Make the splash screen always white (regardless of system/theme), centered exactly, and show only the Fixbudi icon mark (no "Fixbudi" wordmark/text) so it reads clearly on the white background.

## File to change
`index.html` — the splash screen markup + inline `<style>` (lines 104–130).

## What changes
1. **Background → pure white, always.** Change the `#splash-screen` inline `background` from `#f5f5f5` to `#ffffff`.
2. **Remove dark-mode background override.** Delete the `@media (prefers-color-scheme: dark)` rule that sets the splash to `#0a0a0a`. The splash is now white in both light and dark themes.
3. **Swap logo → icon mark.** Replace the `src` of the splash `<img>` from `/fixbudi-logo-light.webp` (full logo with text) to `/fixbudi-icon.png` (icon-only mark). The pop animation stays.
4. **Center exactly.** The flex container already centers with `align-items: center; justify-content: center` — keep that. Size the icon to a clean centered mark (e.g. `width: 120px; height: 120px;`) so it sits dead-center.
5. Leave everything else untouched — `removeSplashScreen` in `src/main.tsx` already fades the splash out and removes it once the app loads, so no JS change is needed.

## Out of scope
- No changes to `src/main.tsx` removal logic, the favicon theme script, app routing, or the Meta Pixel.

## Verification
- Reload the preview in both light and dark system theme: splash is pure white; the Fixbudi icon mark is centered dead-center with no text; it gently pops in/out; splash fades away once the app is ready.
