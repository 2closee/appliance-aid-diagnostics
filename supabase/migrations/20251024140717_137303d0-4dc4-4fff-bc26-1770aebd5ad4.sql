-- Rename Stripe-specific columns to be payment provider agnostic
ALTER TABLE payments
  RENAME COLUMN stripe_checkout_session_id TO payment_reference;

ALTER TABLE payments
  RENAME COLUMN stripe_payment_intent_id TO payment_transaction_id;

-- Add payment provider column
ALTER TABLE payments
  ADD COLUMN payment_provider TEXT DEFAULT 'paystack';

-- Add index for faster lookups
CREATE INDEX idx_payments_reference ON payments(payment_reference);
CREATE INDEX idx_payments_transaction ON payments(payment_transaction_id);