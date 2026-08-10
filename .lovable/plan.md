# FixBudi Repair Protection (Insurance) — Design & Plan

Optional paid protection a customer can add at checkout on phone and laptop repairs. It buys a 3-month same-issue guarantee where the repair center re-fixes free of charge and the protection fund pays the return logistics (both legs) so the customer pays nothing.

## My recommendation on the product shape

Call it **FixBudi Repair Protection**, not "insurance". Selling "insurance" in Nigeria is a regulated activity under NAICOM; a service guarantee / extended-warranty plan attached to a repair you already sold is not. Same money, same benefit, far less regulatory exposure. All copy should say "Repair Protection Plan", "protection fee", "covered", never "insurer/premium/policy".

Second recommendation: the repair center's 3-month same-issue workmanship warranty should be **mandatory for every phone/laptop repair on the platform** (they signed for it), and the paid add-on should cover the *logistics and handling* of exercising it, plus a diagnostic re-check. That is honest, easy to explain, and cheap to underwrite — the center absorbs the labour, FixBudi only funds movement.

## Pricing (checkbox at checkout, auto-calculated)

Tiered off the approved repair cost, phones and laptops only:

| Repair cost (₦) | Protection fee (₦) |
|---|---|
| up to 20,000 | 3,000 |
| 20,001 – 35,000 | 3,500 |
| 35,001 – 50,000 | 4,500 |
| 50,001 – 100,000 | 6,500 |
| above 100,000 | 8% of repair cost, capped at 15,000 |

Stored as a config table so you can retune tiers without a code change. Covers up to **2 round-trip claims** in the 3 months (protects against a device that is simply dying), and logistics cover is capped per claim at the current gadget delivery rate + 20%.

## Checkout the customer sees

```text
Repair (Screen replacement)        ₦25,000
Pickup & delivery (Ovapass)         ₦3,500
[x] Repair Protection — 3 months    ₦3,500
    Same fault comes back? Free re-fix, free pickup & return.
------------------------------------------
Total                              ₦32,000
```

Unchecked by default, with a one-line "what's covered / what's not" expander. Declining is a single click and is recorded (so a later dispute can show the choice).

## Claim flow (customer dashboard)

1. Covered job shows a "Protected until <date>" badge and a **Report same issue** button.
2. Customer picks the original fault from the list, describes it, optionally attaches a photo/video, and the self-test tool can be re-run to attach evidence.
3. Claim opens, routed to the original repair center, which accepts or contests within 48h. Contested claims escalate to FixBudi support for mediation.
4. On acceptance, a pickup is dispatched with the delivery cost charged to the protection fund, not the customer. OTP handoff and condition photos work exactly as today.
5. Re-repair completes, return leg also funded, claim closes, remaining claim allowance decremented.

## Unused fees after 3 months

Hold protection fees in a **protection reserve ledger** rather than treating them as immediate revenue. On expiry with no claim, the balance is released to FixBudi revenue. Recommended split for sustainability: 70% reserve for claims, 30% recognised at sale as administration. Reason: with a maturing book, released fees fund the claims of newer plans, and you can see the loss ratio per month in admin before you touch pricing. Alternative if you prefer goodwill over margin: convert 50% of an unclaimed fee into a credit toward the customer's next repair — good retention, worse cash. Admin dashboard will show fees collected, claims paid, loss ratio, and reserve balance so the choice stays informed.

## Repair centre agreement

A dedicated **Schedule A — Workmanship Warranty & Repair Protection Undertaking** appended to the partner agreement, to be accepted electronically at onboarding (checkbox + typed name + timestamp + IP recorded), and blocking for any centre accepting phone/laptop jobs. Substance:

- 90-day workmanship warranty on every phone/laptop repair, covering recurrence of the same fault, failure of parts fitted, and defective workmanship — re-repaired at no charge to customer or FixBudi.
- Turnaround commitment on a covered return, and free re-return of the device.
- Exclusions: new/unrelated faults, liquid or impact damage after collection, third-party interference or tampering evidence, customer software changes, consumables, battery wear beyond stated tolerance.
- Dispute path: FixBudi mediation first, then arbitration; centre bears re-repair cost where the claim is upheld, FixBudi bears logistics from the protection fund.
- Consequences of breach: chargeback of the repair fee, suspension, delisting.
- Legal framing under Nigerian law: Federal Competition and Consumer Protection Act 2018 (implied warranty of quality and of repair services, s.130–132 remedies), the Sale of Goods Act as applicable in the relevant state, Rivers State and other applicable state consumer-protection instruments, data handling under the Nigeria Data Protection Act 2023, arbitration under the Arbitration and Mediation Act 2023 with seat stated per centre's state of operation, and an express statement that the plan is a service guarantee and not a contract of insurance under the Insurance Act.

The draft will be a real, signable document in the repo and rendered in-app. It is a solid commercial draft, not a substitute for sign-off — have a Nigerian commercial lawyer review before you make it binding, particularly the arbitration seat and the non-insurance characterisation.

## Technical section

Database (one migration):
- `protection_pricing_tiers` — min/max repair cost, flat fee or percentage, cap, active flag.
- `repair_protection_plans` — repair_job_id, user_id, repair center, device_category (`phone`/`laptop`), repair_cost_at_purchase, fee_amount, status (`active`/`expired`/`exhausted`/`cancelled`), starts_at, expires_at (starts_at + 90 days), claims_used, max_claims, accepted_terms_version.
- `protection_claims` — plan_id, repair_job_id, reported_fault, description, evidence urls, status (`submitted`/`center_accepted`/`center_contested`/`in_mediation`/`in_repair`/`resolved`/`rejected`), decision notes, linked delivery_request ids, cost paid from fund.
- `protection_ledger` — plan_id, entry type (`fee_collected`/`claim_logistics_paid`/`released_to_revenue`), amount, period.
- `partner_agreement_acceptances` — repair_center_id, agreement version, accepted_by, accepted_at, ip, full_name typed.
- RLS: customers see their own plans/claims; centre staff see plans and claims for their centre; admins see all; GRANTs to `authenticated` and `service_role` per new table; ledger and pricing writes restricted to service role / admin.

Edge functions:
- `calculate-protection-quote` — device category + repair cost → fee, eligibility, terms version.
- `purchase-protection` — invoked with the repair payment; records plan only after Paystack confirms, inside the existing `paystack-webhook` flow so an unpaid session never creates cover.
- `submit-protection-claim`, `respond-to-protection-claim` — claim lifecycle, notifications to centre and customer.
- `protection-claim-dispatch` — creates the pickup/return `delivery_requests` with cost attributed to the fund, reusing the existing dispatcher, OTP and condition-photo flow.
- `expire-protection-plans` — scheduled sweep: mark expired, write `released_to_revenue` ledger entries.

Frontend:
- `ProtectionOptInCard` in the payment step of `RepairJobDetail` / `CustomerDashboard` payment CTA, gated to phone/laptop jobs via `src/lib/logistics/itemRouting.ts` categorisation.
- Protection badge + `Report same issue` dialog on covered jobs; claim status timeline.
- Repair centre dashboard: incoming claims queue with accept/contest.
- Admin: protection tab — fees, claims, loss ratio, reserve, tier editor.
- Onboarding gate rendering Schedule A with acceptance capture.
- `docs/legal/repair-protection-schedule-a.md` plus an in-app Terms page section.

Existing `repair_warranties` / `warranty_claims` tables stay as the free 30-day baseline; the new plan is the paid 90-day layer that funds logistics. I will not rewire the existing warranty tables in this change.

## Build order

1. Migration + pricing tiers + Schedule A draft and onboarding acceptance.
2. Quote + purchase wired into the payment flow, protection badge on jobs.
3. Claim submission, centre response, funded dispatch.
4. Expiry sweep, ledger release, admin analytics.
