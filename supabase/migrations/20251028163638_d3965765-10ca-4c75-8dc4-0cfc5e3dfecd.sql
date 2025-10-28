-- Update sample jobs to test different quote flow stages

-- Update first job to quote_requested status (so repair center can provide quote)
UPDATE repair_jobs 
SET job_status = 'quote_requested'
WHERE id = (SELECT id FROM repair_jobs WHERE job_status = 'requested' LIMIT 1);

-- Update second job to quote_pending_review (so customer can accept/reject/negotiate)
UPDATE repair_jobs 
SET job_status = 'quote_pending_review',
    quoted_cost = 45000.00,
    quote_notes = 'Based on your diagnostic report, the issue appears to be with the motherboard. This quote includes parts replacement and 90-day warranty.',
    quote_provided_at = NOW(),
    quote_response_deadline = NOW() + INTERVAL '48 hours',
    quote_expires_at = NOW() + INTERVAL '7 days',
    ai_diagnosis_summary = 'AI detected power supply failure with 85% confidence',
    ai_confidence_score = 0.85,
    ai_estimated_cost_min = 40000,
    ai_estimated_cost_max = 55000
WHERE id = (SELECT id FROM repair_jobs WHERE job_status = 'requested' OFFSET 1 LIMIT 1);

-- Update third job to repair_completed with final_cost (so customer can make payment)
UPDATE repair_jobs 
SET job_status = 'repair_completed',
    final_cost = 50000.00,
    app_commission = 3750.00,
    payment_deadline = NOW() + INTERVAL '7 days'
WHERE id = (SELECT id FROM repair_jobs WHERE job_status = 'completed' LIMIT 1);