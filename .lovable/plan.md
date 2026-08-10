# Ovapass rider payment structure: two models, admin-controlled rates

Two separate money books, as you described:

- **Ovapass book** — ride fees only: what the customer paid for the ride, FixBudi's cut, the rider's cut, wallet balances and rider debts.
- **FixBudi book** — repairs and Repair Protection (guarantee) fees. Untouched by this work.

## How each rider type gets paid

**FixBudi riders (`fleet_type = company`, our e-bikes)**
- Ride fee is collected inside the app as part of the customer's payment (e.g. ₦30,000 = ₦27,000 repair + ₦3,000 ride).
- On trip completion the ride fee is split: rider share (default **50%**) and FixBudi share (default 50%).
- The rider's share is credited to their in-app **wallet**. FixBudi's share never leaves us.
- Weekly cycle: earnings accumulate Monday–Sunday; the rider sees "available to withdraw" and can request a withdrawal once per cycle. Admin marks the payout paid (bank transfer for now), which closes those ledger entries.
- Rider never collects cash.

**Third-party riders (`fleet_type = partner`, own bike)**
- Rider collects the full ride fee in cash from the customer at pickup/delivery.
- On completion the trip records: full fee, FixBudi commission (default **30%**, admin-editable) and rider earning (70%).
- The commission becomes a **debt** on the rider's Ovapass account. They see "you owe FixBudi ₦X".
- **Debt cap:** they can keep working for up to N more completed trips (default **5**) or up to a naira ceiling while owing. Past that, they are blocked from receiving new offers ("settle your balance to go back online") until they pay in.
- Rider pays into their wallet (Paystack or transfer + admin confirmation); the payment clears the oldest open commission entries.

## What the rider dashboard shows (both types)

Per trip and per week:
- Total charged for the ride
- FixBudi's cut (with the % applied)
- Rider's cut
- Status: `credited to wallet` (company) or `cash collected, commission owed` (partner)

Plus headline cards: this week's gross, my earnings, FixBudi's cut, wallet balance / available to withdraw, and outstanding debt with trips remaining before block.

## Admin control panel (no code changes to tweak rates)

On `/admin/ovapass`, a Payment Settings card editing the live pricing row:
- FixBudi rider share % (default 50)
- Third-party commission % (default 30)
- Debt cap: max unsettled trips (default 5) and max unsettled amount
- Weekly payout day and minimum withdrawal amount

Changes apply to trips created after the change; already-completed trips keep the rate they were priced at (stored on the trip), so history stays accurate.

## Admin operations

- **Payout queue:** company riders with a pending weekly withdrawal — approve/mark paid.
- **Debt collection:** partner riders ranked by amount owed, with blocked-status flag and a "confirm payment received" action.
- **Ovapass ledger summary:** ride revenue, commission collected, commission outstanding, rider payouts — kept separate from repair/protection revenue.

## Technical notes

- `overpass_pricing`: replace the current `commission_rate_company = 1.00` with a `rider_share_company` (0.50) meaning of the split, keep `commission_rate_partner` renamed/defaulted to 0.30, and add `max_unsettled_trips`, `max_unsettled_amount`, `payout_day`, `min_withdrawal`.
- `overpass_trips` already stores `fee`, `commission_rate`, `commission_amount`, `rider_earning` — the fee calculator in `_shared/overpass/geo.ts` changes so company trips split 50/50 instead of FixBudi taking 100%.
- `rider_ledger` gains entry types `payout` (wallet debit on withdrawal) and `settlement` (rider clearing debt), plus a `settlement_period` label for weekly grouping. Wallet balance and debt are derived from the ledger — no separate balance column to drift out of sync.
- New `rider_payouts` table for weekly withdrawal requests (rider_id, period, amount, status, approved_by, paid_at) with RLS: rider sees their own, admins see all.
- `overpass-trip-status` completion path writes the correct split per fleet type and, for partners, checks the debt cap and flags the rider blocked.
- `_shared/overpass/assign.ts` skips riders who are blocked for unpaid commission.
- New edge functions: `ovapass-request-payout` (company rider withdrawal) and `ovapass-settle-debt` (partner payment in, Paystack or admin confirmation). All rate reads come from the pricing row, never hardcoded.
