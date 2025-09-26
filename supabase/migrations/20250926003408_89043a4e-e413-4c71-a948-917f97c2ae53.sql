-- Remove RLS policies that allow users to self-apply as repair center staff
DROP POLICY IF EXISTS "Users can apply as repair center staff" ON public.repair_center_staff;
DROP POLICY IF EXISTS "Users can create their own staff record during application" ON public.repair_center_staff;

-- Update existing policies to clarify business vs user separation
CREATE POLICY "Business owners can manage their staff records" 
ON public.repair_center_staff 
FOR ALL 
USING (
  -- Only allow access if user is the owner of this repair center
  is_owner = true AND auth.uid() = user_id
  OR
  -- Or if user is admin of this repair center
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.repair_center_id = repair_center_staff.repair_center_id
    AND rcs.user_id = auth.uid()
    AND rcs.role = 'admin'
    AND rcs.is_active = true
  )
)
WITH CHECK (
  -- Same conditions for inserts/updates
  is_owner = true AND auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.repair_center_id = repair_center_staff.repair_center_id
    AND rcs.user_id = auth.uid()
    AND rcs.role = 'admin'
    AND rcs.is_active = true
  )
);