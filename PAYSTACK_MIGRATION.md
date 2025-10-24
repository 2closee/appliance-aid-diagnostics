# 🇳🇬 Paystack Payment Integration - Complete Migration Guide

## ✅ What Was Changed

Your payment system has been successfully migrated from Stripe to **Paystack**, which is optimized for Nigerian payments and better suited for your Port Harcourt market.

---

## 🔄 Database Changes

### Column Renaming (Payment Provider Agnostic)
We renamed Stripe-specific columns to be generic:

| Old Column Name | New Column Name | Purpose |
|----------------|-----------------|---------|
| `stripe_checkout_session_id` | `payment_reference` | Paystack transaction reference |
| `stripe_payment_intent_id` | `payment_transaction_id` | Paystack transaction ID |

### New Columns
- **`payment_provider`**: Tracks which payment provider was used (default: "paystack")

### Indexes Added
- `idx_payments_reference` - Fast lookup by payment reference
- `idx_payments_transaction` - Fast lookup by transaction ID

---

## 💳 Paystack Integration Details

### 1. **Create Repair Payment** (`supabase/functions/create-repair-payment/index.ts`)

**What it does:**
- Creates a Paystack payment transaction when a customer wants to pay for a repair
- Initializes payment with customer email, amount, and metadata
- Returns Paystack authorization URL for customer to complete payment

**Key Features:**
- **Amount Conversion**: Automatically converts Naira to kobo (smallest unit)
  - Example: ₦1,000.00 → 100,000 kobo
- **Callback URL**: Returns customer to job detail page after payment
- **Metadata Storage**: Stores job details for tracking
  ```json
  {
    "repair_job_id": "uuid",
    "user_id": "uuid",
    "payment_type": "repair_service",
    "customer_name": "John Doe",
    "appliance_type": "Refrigerator"
  }
  ```

**Payment Flow:**
```
Customer clicks "Pay" 
  → Edge function creates Paystack transaction
  → Returns authorization_url
  → Customer redirected to Paystack payment page
  → Customer completes payment (card/bank transfer)
  → Paystack redirects back with reference
```

---

### 2. **Paystack Webhook Handler** (`supabase/functions/paystack-webhook/index.ts`)

**What it does:**
- Listens for payment events from Paystack
- Verifies webhook signature for security
- Automatically updates database when payments succeed/fail
- Triggers email notifications

**Events Handled:**

#### `charge.success`
- Updates payment status to "completed"
- Sets `payment_date` to current timestamp
- Updates repair job status to "completed"
- Sets `customer_confirmed` to true
- Sends payment confirmation email

#### `charge.failed`
- Updates payment status to "failed"
- Logs failure for debugging

**Security:**
- Verifies webhook signature using HMAC SHA-512
- Rejects requests with invalid signatures
- Uses service role key for database access

---

### 3. **Verify Payment Status** (`supabase/functions/verify-payment-status/index.ts`)

**What it does:**
- Manually verifies payment status with Paystack API
- Used when customer returns from payment page
- Updates local database based on Paystack's response

**When to use:**
- Customer returns to your site after payment
- Need to confirm payment before showing success message
- Webhook hasn't arrived yet (rare)

**API Call:**
```javascript
GET https://api.paystack.co/transaction/verify/{reference}
Authorization: Bearer PAYSTACK_SECRET_KEY
```

---

## 💰 Currency Updates

### Naira (₦) Display Format
All prices now display in Nigerian Naira with proper formatting:

```javascript
// Old (USD):
$1,234.56

// New (NGN):
₦1,234.56
```

### Formatting Function:
```javascript
amount.toLocaleString('en-NG', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})
```

### Files Updated:
1. **`src/pages/RepairJobDetail.tsx`**
   - Estimated cost display
   - Final cost display
   - Service fee (7.5%) display

2. **`src/pages/RepairJobs.tsx`**
   - Estimated cost in job cards
   - Final cost in job cards
   - Service fee in job cards
   - Payment button text

3. **`src/lib/currency.ts`** (already defaults to NGN ✅)
   - DEFAULT_CURRENCY = "NGN"
   - CURRENCY_SYMBOLS includes ₦

---

## 🔧 Configuration Updates

### Supabase Config (`supabase/config.toml`)

**Added Functions:**
```toml
[functions.paystack-webhook]
verify_jwt = false  # Webhooks don't have JWT tokens

[functions.verify-payment-status]
verify_jwt = true   # Requires user authentication
```

**Removed:**
```toml
[functions.stripe-webhook]  # Deleted - no longer needed
```

---

## 🔐 Required Secrets

### You Need to Add:

**`PAYSTACK_SECRET_KEY`**
- Get from: https://dashboard.paystack.com/#/settings/developers
- Format: `sk_test_xxxxx` (test mode) or `sk_live_xxxxx` (live mode)
- Used by: All payment edge functions

### How to Add Secret:
1. Go to your Supabase Dashboard
2. Navigate to Project Settings → Edge Functions → Secrets
3. Add new secret:
   - Name: `PAYSTACK_SECRET_KEY`
   - Value: Your Paystack secret key from dashboard

---

## 🎯 Testing Your Integration

### 1. **Test Mode Setup**
1. Get test secret key from Paystack dashboard
2. Add to Supabase secrets
3. Use Paystack test cards for testing

### 2. **Paystack Test Cards**

| Card Number | CVV | Expiry | PIN | Expected Result |
|------------|-----|--------|-----|----------------|
| 4084084084084081 | 408 | Any future date | 0000 | Success |
| 4084084084084081 | 408 | Any future date | 1111 | Failed |

### 3. **Test Payment Flow**
```
1. Create a repair job with final_cost
2. Click "Pay" button
3. You'll be redirected to Paystack payment page
4. Use test card: 4084084084084081
5. Enter any future expiry date
6. CVV: 408
7. PIN: 0000 (for success) or 1111 (for failure)
8. Complete payment
9. You'll be redirected back to job detail page
10. Payment status will update automatically
```

### 4. **Verify Webhook**
1. Make a test payment
2. Check Supabase Edge Function logs for `paystack-webhook`
3. Verify payment status updated in database
4. Check email was sent

---

## 🌐 Webhook Configuration

### Setup Paystack Webhook:

1. **Go to Paystack Dashboard**
   - https://dashboard.paystack.com/#/settings/developers

2. **Add Webhook URL**
   ```
   https://esbqtuljvejvrzawsqgk.supabase.co/functions/v1/paystack-webhook
   ```

3. **Select Events to Listen To:**
   - ✅ charge.success
   - ✅ charge.failed

4. **Webhook Secret**
   - Paystack will provide a secret
   - **Important**: This is DIFFERENT from your API secret key
   - Add this as `PAYSTACK_WEBHOOK_SECRET` in Supabase secrets (optional - currently not using it)

---

## 📊 Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CUSTOMER                                 │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ 1. Clicks "Pay ₦X,XXX.XX"
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND (RepairJobDetail.tsx)                      │
│  - Calls create-repair-payment edge function                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ 2. POST to edge function
             ▼
┌─────────────────────────────────────────────────────────────────┐
│        EDGE FUNCTION (create-repair-payment)                     │
│  - Verifies user & job                                          │
│  - Calls Paystack API                                           │
│  - Creates payment record in DB                                 │
│  - Returns authorization_url                                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ 3. Redirect to Paystack
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PAYSTACK PAYMENT PAGE                         │
│  - Customer enters card details                                 │
│  - Processes payment                                            │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ 4. Payment completed
             ├──────────────────────┬─────────────────────────────┐
             │                      │                             │
             ▼                      ▼                             ▼
    (A) Redirect Back      (B) Webhook Fired         (C) Manual Verify
         to Your Site        Immediately               (Backup)
             │                      │                             │
             ▼                      ▼                             ▼
┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
│  Frontend checks    │  │ paystack-webhook     │  │ verify-payment-     │
│  URL params         │  │ - Updates payment    │  │ status              │
│                     │  │ - Updates job        │  │ - Queries Paystack  │
│                     │  │ - Sends email        │  │ - Updates DB        │
└─────────────────────┘  └──────────────────────┘  └─────────────────────┘
```

---

## ⚠️ Important Notes

### 1. **Webhook is Critical**
- Without the webhook, payments may not update automatically
- The webhook is the PRIMARY way payment status is updated
- Manual verification (`verify-payment-status`) is a BACKUP

### 2. **Test Before Going Live**
- Use test mode extensively
- Test success and failure scenarios
- Verify emails are sent
- Check database updates

### 3. **Commission Calculation**
- 7.5% platform fee is still calculated
- Stored in `app_commission` column
- Deducted from repair center payout

### 4. **Currency Considerations**
- All amounts stored in Naira (NGN)
- Paystack expects amounts in kobo (multiply by 100)
- Display amounts with ₦ symbol

### 5. **Error Handling**
- All functions have comprehensive error logging
- Check Edge Function logs for debugging
- Paystack errors are clearly logged

---

## 🚀 Going Live Checklist

Before switching to live mode:

- [ ] Test all payment scenarios in test mode
- [ ] Verify webhook is working correctly
- [ ] Add live Paystack secret key (`sk_live_xxxxx`)
- [ ] Update webhook URL in Paystack dashboard to production URL
- [ ] Test one real transaction with small amount
- [ ] Monitor Edge Function logs for 24 hours
- [ ] Verify payouts to repair centers are calculated correctly
- [ ] Ensure emails are being sent properly

---

## 📞 Support Resources

### Paystack Documentation
- API Reference: https://paystack.com/docs/api/
- Webhooks: https://paystack.com/docs/payments/webhooks/
- Test Cards: https://paystack.com/docs/payments/test-payments/

### Contact Paystack Support
- Email: support@paystack.com
- Phone: +234 (1) 888 7338

---

## 🎉 Benefits of Paystack for Nigerian Market

1. **Local Payment Methods**
   - Nigerian bank cards
   - Bank transfers
   - USSD
   - Mobile money

2. **Better Conversion Rates**
   - No international payment failures
   - Familiar payment interface for Nigerians
   - Multiple payment options

3. **Lower Fees**
   - 1.5% + ₦100 (capped at ₦2,000)
   - vs Stripe: 3.9% + $0.30

4. **Instant Settlements**
   - Receive funds within 24 hours
   - Direct to Nigerian bank accounts
   - No currency conversion fees

5. **Compliance**
   - Licensed by CBN (Central Bank of Nigeria)
   - PCI-DSS compliant
   - Local support team

---

## 🔍 Troubleshooting

### Payment Not Updating
1. Check Edge Function logs for `paystack-webhook`
2. Verify webhook URL is correct in Paystack dashboard
3. Check `PAYSTACK_SECRET_KEY` is set correctly
4. Try manual verification using `verify-payment-status`

### Webhook Not Firing
1. Check webhook URL accessibility
2. Verify webhook is enabled in Paystack dashboard
3. Check for signature validation errors in logs
4. Ensure `verify_jwt = false` in config.toml

### Payment Amount Incorrect
1. Verify amount is being multiplied by 100 (kobo conversion)
2. Check `final_cost` value in repair_jobs table
3. Verify commission calculation is correct (7.5%)

---

## 📈 Next Steps

1. **Add PAYSTACK_SECRET_KEY secret** (REQUIRED)
2. **Configure webhook in Paystack dashboard** (REQUIRED)
3. **Test payment flow thoroughly**
4. **Monitor first real transactions closely**
5. **Consider adding SMS notifications** (Phase 2)
6. **Set up payout system for repair centers** (Phase 2)

---

Made with ❤️ for the Port Harcourt market 🇳🇬
