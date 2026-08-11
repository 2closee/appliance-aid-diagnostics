# Fix AI chat panel overlapping the recommended repair centers

On the diagnostic page the report and the "Recommended repair centers" panel are rendered directly below the AI chat card, in the correct order. The overlap comes from the chat card itself: it is locked to a fixed `h-[600px]` (`src/components/AIChatInterface.tsx`), while its inner column (message scroll area + separator + upload row + image previews + textarea/send controls) can grow taller than 600px. Because the flex children have no min-height reset and the card does not clip, the composer area spills past the card's bottom edge and paints over the report and the centers panel — hiding the "Chat with this center" buttons, especially on smaller viewports like 884px wide.

## What to change (frontend/layout only)

1. `src/components/AIChatInterface.tsx`
   - Replace the rigid `h-[600px]` with a flexible height: `min-h-[420px] max-h-[75vh]` (plus `overflow-hidden` on the card) so the card grows with its composer instead of overflowing it.
   - Add `min-h-0` to the flex content wrapper and to the `ScrollArea` so the transcript shrinks first and the composer is never pushed outside the card.
   - Keep the composer block as a non-shrinking footer (`shrink-0`) so uploads, image previews and the textarea always stay inside the card bounds.

2. `src/pages/Diagnostic.tsx`
   - Keep the existing order (chat → report → recommended centers) and make the stacking explicit with `relative z-0` on the chat block, so nothing can paint over the panels below it.
   - Scroll the recommended-centers panel into view once a report exists, so the handoff buttons are immediately visible after diagnosis.

3. `src/components/diagnostic/RecommendedCentersPanel.tsx`
   - Add `relative z-10` to its card so it always renders above any sibling overflow.

## Verification

Run the diagnostic flow in the preview at the 884px viewport, generate a report, and confirm with a screenshot that the report and the "Chat with this center" buttons are fully visible and clickable, with no element overlapping them.
