-- Set a completed job back to 'returned' status for testing the two-step confirmation
UPDATE repair_jobs 
SET 
  job_status = 'returned',
  device_returned_confirmed = false,
  repair_satisfaction_confirmed = false,
  customer_confirmed = false,
  device_returned_confirmed_at = NULL,
  repair_satisfaction_confirmed_at = NULL,
  satisfaction_rating = NULL,
  satisfaction_feedback = NULL
WHERE id = (
  SELECT id FROM repair_jobs 
  WHERE repair_center_id IN (SELECT id FROM "Repair Center" WHERE name ILIKE '%james%')
  AND job_status = 'completed'
  ORDER BY created_at DESC 
  LIMIT 1
);