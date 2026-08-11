# Remove test repair centers, keep only CAC-verified partners

Confirmed current state of the `Repair Center` table:

| id | Name | CAC number | Status | Jobs | Conversations | Staff |
|----|------|-----------|--------|------|---------------|-------|
| 4 | Meranos Fixgadget | none | suspended | 1 | 2 | 0 |
| 21 | Jame Place | RC2434346677 | suspended | 11 | 2 | 1 |
| 42 | Evergrow Gadgets | RC1625500 | active | 0 | 0 | 1 |
| 43 | Harrydee Global Services | RC1406734 | active | 0 | 0 | 1 |
| 44 | Dementorworldtech | RC3073965 | active | 0 | 0 | 1 |

Centers 4 and 21 are the test entries and get permanently purged. Centers 42, 43 and 44 stay — each has a CAC business name plus RC number and an approved application.

## What happens

1. Archive centers 4 and 21 (sets `deleted_at`), which is the precondition the purge flow enforces.
2. Run the existing permanent purge for each of them via the `purge-repair-center` edge function, so all dependent records are removed in FK-safe order: repair jobs and status history, conversations and messages, diagnostic conversations/messages/reports, recommendations, reviews, staff links, settings, bank accounts, payouts and payout settings, referrals and rewards, deliveries with photos/status history/commissions, protection plans/claims/ledger, warranties and warranty claims, partner agreement acceptances, and the centers' logo/cover files in storage. Each purge is written to `repair_center_purge_log`.
3. Repair center **application** rows are left untouched, as requested — including the rejected duplicate "Dementor world Tech" entry.
4. No user accounts are deleted; the staff account tied to Jame Place keeps its login, it just loses its center link.

After this, `/repair-centers`, the pickup/center selectors and the admin Active tab list only the three CAC-verified partners.

## Technical notes

- Purge is executed through the existing `purge-repair-center` edge function (super-admin gated, service-role cleanup) rather than raw SQL, so the audit log and storage cleanup both happen.
- The function's guardrails block a purge when a center has jobs still in progress or unsettled payouts. Jame Place's 11 jobs will be checked first; if any are open, they are closed out as cancelled for the purge to proceed, and the plan reports what was closed.
- No schema changes and no code changes — this is a data cleanup using the flow already built for it.
