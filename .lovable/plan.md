## Goal
Make the copyright year in the footer auto-update each year.

## Change
**`src/pages/Index.tsx`** (line 521): Replace the hardcoded year with a dynamic one.

Before:
```tsx
© 2025 Fixbudi. All rights reserved.
```

After:
```tsx
© {new Date().getFullYear()} Fixbudi. All rights reserved.
```

## Notes
- `JoinRepairCenter.tsx` already uses `new Date().getFullYear()` — no change needed.
- No other pages contain a hardcoded copyright year.