-- Add additional fields to Repair Center table
ALTER TABLE "Repair Center" 
ADD COLUMN number_of_staff INTEGER DEFAULT 0,
ADD COLUMN years_of_experience INTEGER DEFAULT 0,
ADD COLUMN cac_name TEXT,
ADD COLUMN cac_number TEXT,
ADD COLUMN tax_id TEXT;

-- Update repair_center_staff table to support staff management roles
ALTER TABLE repair_center_staff 
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN is_owner BOOLEAN DEFAULT false;

-- Create RLS policies for staff management
CREATE POLICY "Center owners can manage their staff" 
ON repair_center_staff 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM repair_center_staff rcs_owner
    WHERE rcs_owner.repair_center_id = repair_center_staff.repair_center_id 
    AND rcs_owner.user_id = auth.uid() 
    AND rcs_owner.is_owner = true 
    AND rcs_owner.is_active = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM repair_center_staff rcs_owner
    WHERE rcs_owner.repair_center_id = repair_center_staff.repair_center_id 
    AND rcs_owner.user_id = auth.uid() 
    AND rcs_owner.is_owner = true 
    AND rcs_owner.is_active = true
  )
);