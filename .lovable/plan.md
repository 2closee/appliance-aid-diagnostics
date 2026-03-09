

## Plan: Super Admin Email Service + Repair Center Referral System

### Feature 1: Email Service on Super Admin Panel

**What it does:** Adds an "Email Repair Centers" section to the Super Admin page where the admin can select one or multiple repair centers and send them custom emails (e.g., feature announcements, notifications).

**Implementation:**

1. **Add a new section to `src/pages/SuperAdmin.tsx`** with:
   - A card titled "Email Repair Centers" listing all active repair centers (name, email, status)
   - A "Send to All" button for bulk emails and per-center "Email" buttons
   - Multi-select checkboxes to email selected centers
   - Reuse the existing `EmailComposerDialog` component, extending it to support multiple recipients

2. **Update `src/components/EmailComposerDialog.tsx`** to support:
   - Multiple recipients (array of emails) with a "To" field showing all selected centers
   - A `recipients` prop alongside the existing single-center props for backward compatibility

3. **Update `send-confirmation-email` edge function** to handle an array of recipients when `type: 'custom'` is used, or create a dedicated `send-admin-broadcast` edge function that loops through recipients using the existing shared email template

---

### Feature 2: Repair Center Referral System

**What it does:** Repair centers can refer other businesses to join FixBudi. When a referred center becomes active, the referring center earns a reward (e.g., commission bonus, featured listing, or credit).

**Database changes (migration):**

1. **Create `center_referrals` table:**
   - `id` (uuid, PK)
   - `referring_center_id` (bigint, FK to "Repair Center")
   - `referred_center_id` (bigint, FK to "Repair Center", nullable -- set when the referred center is approved)
   - `referred_email` (text) -- email of the referred business
   - `referred_business_name` (text)
   - `referral_code` (text, unique) -- unique code per referral
   - `status` (text: pending, registered, active, rewarded)
   - `reward_type` (text: commission_bonus, credit, featured_listing)
   - `reward_amount` (numeric, nullable)
   - `reward_paid_at` (timestamptz, nullable)
   - `created_at`, `updated_at`
   - RLS: centers can see their own referrals; super_admin sees all

2. **Add `referral_code` column to `repair_center_applications` table** so applications can be linked to a referrer

3. **Create `center_referral_rewards` table** (ledger of earned rewards):
   - `id`, `referral_id` (FK), `center_id` (FK), `reward_type`, `amount`, `status` (pending/paid), `paid_at`, `created_at`

**Frontend changes:**

4. **Add referral management section to Super Admin page** showing:
   - Total referrals, active referrals, rewards paid out
   - Table of all referrals with status, referring center, referred center, reward status
   - Ability to mark rewards as paid

5. **Create `src/components/ReferralManagement.tsx`** component for the Super Admin panel with the referral dashboard and actions

6. **Add referral link generation for repair centers** in the Repair Center Dashboard (`src/components/dashboard/RepairCenterDashboard.tsx`):
   - A "Refer a Center" card where centers can generate/copy their unique referral link
   - A table showing their referral history and earned rewards

7. **Update the repair center application flow** (`src/pages/RepairCenterApplication.tsx`) to:
   - Accept a `?ref=CODE` query parameter
   - Store the referral code with the application
   - When an application is approved, update the referral status to "active"

8. **Update `approve-repair-center-application` edge function** to check for referral codes and update the `center_referrals` table when a referred center becomes active

---

### Technical Details

- The email feature reuses the existing `send-confirmation-email` edge function with the `type: 'custom'` path, extended to support batch sending
- Referral codes will be generated as short alphanumeric strings (e.g., `FBR-XXXXX`)
- RLS policies will ensure centers only see their own referrals, while super_admin sees all
- The referral reward is tracked but requires manual approval from super admin before payout

