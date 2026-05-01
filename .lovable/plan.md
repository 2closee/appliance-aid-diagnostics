## Plan: Remove Self-Test CTA from homepage

### Change
Remove the "Run Free Phone Self-Test" secondary button from the homepage hero (`src/pages/Index.tsx`, lines 74–76). The "Start Diagnosis" and "Find Repair Centers" buttons remain.

### What stays
- The `/self-test` route in `src/App.tsx` (still accessible by URL).
- The "Self-Test" link in `Navigation.tsx` — kept so users on any page can still reach it.
- The promotional banner inside `/diagnostic` that surfaces the self-test as part of the Start Diagnosis flow (matches the user's requested entry point).
- The `SelfTest` page itself and all its tests — untouched.

### Files modified
- `src/pages/Index.tsx` — delete the 3-line `<Button>` block for the self-test CTA.

### Note
If you'd also like the "Self-Test" link removed from the top navigation (so it's only reachable from within Start Diagnosis), let me know and I'll remove it too. Otherwise I'll leave it in nav for discoverability.