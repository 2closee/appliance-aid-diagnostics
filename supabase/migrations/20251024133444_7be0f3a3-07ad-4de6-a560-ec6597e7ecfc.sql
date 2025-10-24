-- ============================================
-- PHASE 1 CRITICAL DATABASE CHANGES
-- ============================================

-- 1. SECURE STORAGE BUCKET (Critical Security Fix)
-- Make diagnostic-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'diagnostic-attachments';

-- Add RLS policies for storage
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diagnostic-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'diagnostic-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins have full access to attachments"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'diagnostic-attachments' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. REVIEWS SYSTEM SCHEMA
-- Create reviews table for repair center ratings
CREATE TABLE IF NOT EXISTS repair_center_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
  repair_center_id BIGINT NOT NULL REFERENCES "Repair Center"(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  response_text TEXT,
  response_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT TRUE,
  UNIQUE(repair_job_id, customer_id)
);

-- Add rating columns to Repair Center table
ALTER TABLE "Repair Center"
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Enable RLS on reviews
ALTER TABLE repair_center_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read reviews
CREATE POLICY "Anyone can read reviews"
ON repair_center_reviews FOR SELECT
TO authenticated
USING (true);

-- RLS: Customers can create reviews for completed jobs
CREATE POLICY "Customers create reviews for completed jobs"
ON repair_center_reviews FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM repair_jobs
    WHERE id = repair_job_id
    AND user_id = auth.uid()
    AND job_status = 'completed'
  )
);

-- RLS: Customers can update their own reviews
CREATE POLICY "Customers update own reviews"
ON repair_center_reviews FOR UPDATE
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- RLS: Repair centers can add responses
CREATE POLICY "Centers respond to reviews"
ON repair_center_reviews FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM repair_center_staff
    WHERE user_id = auth.uid()
    AND repair_center_id = repair_center_reviews.repair_center_id
  )
)
WITH CHECK (response_text IS NOT NULL);

-- Trigger to update repair center average rating
CREATE OR REPLACE FUNCTION update_repair_center_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Repair Center"
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM repair_center_reviews
      WHERE repair_center_id = NEW.repair_center_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM repair_center_reviews
      WHERE repair_center_id = NEW.repair_center_id
    )
  WHERE id = NEW.repair_center_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON repair_center_reviews
FOR EACH ROW
EXECUTE FUNCTION update_repair_center_rating();

-- 3. PAYMENT WEBHOOK TRACKING
-- Add columns to track webhook events
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE;

-- 4. EMAIL NOTIFICATION TRACKING
-- Create table to track sent emails
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB
);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their email notifications"
ON email_notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM repair_jobs
    WHERE repair_jobs.id = email_notifications.repair_job_id
    AND repair_jobs.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. LEGAL ACCEPTANCE TRACKING
-- Add columns to track legal acceptance
ALTER TABLE "Repair Center"
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0';

-- Create index for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_repair_jobs_user_status ON repair_jobs(user_id, job_status);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_center_status ON repair_jobs(repair_center_id, job_status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_center ON repair_center_reviews(repair_center_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_job ON repair_center_reviews(repair_job_id);