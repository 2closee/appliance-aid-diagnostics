-- Check if the privilege escalation prevention trigger exists, if not create it
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent non-owners from setting themselves as owners
  IF NEW.is_owner = true AND (OLD.is_owner IS NULL OR OLD.is_owner = false) THEN
    -- Only allow if the user is an admin or an existing owner of the same center
    IF NOT (
      has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM repair_center_staff rcs
        WHERE rcs.repair_center_id = NEW.repair_center_id
        AND rcs.user_id = auth.uid()
        AND rcs.is_owner = true
        AND rcs.is_active = true
      )
    ) THEN
      RAISE EXCEPTION 'Access denied: Cannot promote self to owner without proper authorization';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS prevent_self_privilege_escalation_trigger ON public.repair_center_staff;

CREATE TRIGGER prevent_self_privilege_escalation_trigger
  BEFORE UPDATE ON public.repair_center_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();