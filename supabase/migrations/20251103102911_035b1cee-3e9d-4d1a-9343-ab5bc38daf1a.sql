-- Add two-step confirmation columns to repair_jobs table
ALTER TABLE repair_jobs 
ADD COLUMN IF NOT EXISTS device_returned_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS device_returned_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS repair_satisfaction_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS repair_satisfaction_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
ADD COLUMN IF NOT EXISTS satisfaction_feedback TEXT;

-- Add comment for backward compatibility
COMMENT ON COLUMN repair_jobs.customer_confirmed IS 'Legacy field - kept for backward compatibility. True when both device_returned_confirmed and repair_satisfaction_confirmed are true.';

-- Create completion feedback notifications table
CREATE TABLE IF NOT EXISTS completion_feedback_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('device_returned', 'satisfaction_confirmed')),
  sent_to TEXT NOT NULL CHECK (sent_to IN ('admin', 'repair_center')),
  recipient_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_data JSONB
);

-- Enable RLS on completion_feedback_notifications
ALTER TABLE completion_feedback_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for completion_feedback_notifications
CREATE POLICY "Admins can view all notifications"
ON completion_feedback_notifications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Repair center staff can view their notifications"
ON completion_feedback_notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM repair_jobs rj
    JOIN repair_center_staff rcs ON rcs.repair_center_id = rj.repair_center_id
    WHERE rj.id = completion_feedback_notifications.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_active = true
  )
);

CREATE POLICY "System can insert notifications"
ON completion_feedback_notifications FOR INSERT
TO authenticated
WITH CHECK (true);