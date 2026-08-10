# Splash: icon-only with themed background

## Decision
Use the standalone Fixbudi icon (`fixbudi-icon.png`, the man's face — no wordmark) on the loading screen, with the background themed (white in light mode, `#0a0a0a` in dark mode). The icon reads clearly on either background, so the wordmark is no longer needed.

## File to change
`index.html` — the splash `<img>` on line 118.

## What changes
1. Swap the splash image source from `/fixbudi-logo-light.webp` to `/fixbudi-icon.png`.
2. Resize it for an icon-only splash: square, ~`120px` width (icon-only is more compact than the wide wordmark), keeping `height: auto`.
3. Keep the existing `pop` keyframe animation on the logo (scale + opacity pulse) — no change to the animation.
4. Keep the themed background: light `#f5f5f5` by default, `#0a0a0a` in dark mode via the existing `prefers-color-scheme: dark` rule (already present, no change).
5. No other changes — `src/main.tsx` splash removal logic is untouched.

## Verification
- Reload the preview in light and dark mode: the icon pops in/out centered on the themed background; no rotating circle; no cut-off wordmark; splash fades once the app is ready.
