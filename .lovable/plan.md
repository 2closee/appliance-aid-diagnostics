# Super admin: suspend, archive, then permanently delete repair centers

Today an admin can suspend a center and "delete" it, but delete only archives it (sets `deleted_at`) — the row and all its related records stay in the database forever, and archived centers disappear from the admin UI entirely so nothing can be done with them. The only true delete that exists is a button hardcoded to one test center ("Meranos Fixgadget").

## What changes

**1. New "Archived" tab in Repair Center Management**
- Lists centers that have been archived (soft-deleted), with the date archived and who archived them, plus a summary of how much data they still hold (jobs, conversations, deliveries, payouts, reviews).
- Each row gets two actions: **Restore** (undo the archive) and **Delete permanently** (super admin only).

**2. Clear three-stage lifecycle**
```text
Active  --Suspend-->  Suspended  --Archive-->  Archived  --Delete permanently-->  gone
```
- Suspend and Restore stay available to admins as today.
- Permanent delete is visible only to super admins, and only for centers already archived.

**3. Guardrails on permanent delete**
- The center must already be archived — no one-click destruction of a live center.
- Blocked if the center still has jobs in progress or unsettled payouts; the dialog explains what must be closed out first.
- Two-step confirmation: the super admin types the center's name to confirm, and the dialog lists exactly what will be destroyed.
- Every permanent delete is recorded in an audit log (who, which center, when, record counts removed) so freed space is traceable after the row is gone.

**4. Full cleanup so space is actually reclaimed**
The existing test-center delete only clears 9 related tables and predates a lot of newer features. The permanent delete will remove everything tied to the center: repair jobs and their status history, conversations and messages, diagnostic conversations/messages/reports, center recommendations, reviews, staff, settings, bank accounts, payouts and payout settings, referrals and referral rewards, deliveries with their photos/status history/commissions, protection plans, claims and ledger entries, warranties and warranty claims, partner agreement acceptances, and the center's uploaded logo/cover images in storage.
Center staff *user accounts* are left untouched — as requested, no user deletion.

**5. Retire the hardcoded test-center button**
The "Delete Test Center (Meranos Fixgadget)" button is replaced by this general flow.

## Technical notes

- New edge function `purge-repair-center`: verifies the caller's JWT, requires the `super_admin` role via `has_role`, requires `deleted_at IS NOT NULL` on the target, runs the blocking checks, deletes dependents in FK-safe order with the service role, removes storage objects, writes the audit row, then deletes the `Repair Center` row.
- Migration: new `repair_center_purge_log` table (center id, name, purged_by, purged_at, deleted_counts jsonb) with GRANTs, RLS enabled and read/insert limited to admins/super admins; also an `archived_at`-style query index if needed. No changes to `Repair Center` columns — `deleted_at`/`deleted_by`/`status` already exist.
- `src/components/dashboard/RepairCenterManagement.tsx`: add an archived-centers query (`deleted_at IS NOT NULL`), the new tab, restore mutation, and a `PurgeCenterDialog` component; gate the permanent-delete action on the current user's `super_admin` role.
- `src/components/dashboard/DeleteTestCenter.tsx` and the `delete-test-center` function are removed once the general purge path is in place.
