-- Add status field to Repair Center table for suspend/activate functionality
ALTER TABLE "Repair Center" 
ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive'));

-- Add index for better performance
CREATE INDEX idx_repair_center_status ON "Repair Center"(status);

-- Add email field if it doesn't exist with a proper default
ALTER TABLE "Repair Center" 
ALTER COLUMN email SET DEFAULT 'center@example.com';