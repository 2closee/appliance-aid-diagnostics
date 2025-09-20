-- Create repair center staff/admin relationship table
CREATE TABLE public.repair_center_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  repair_center_id BIGINT NOT NULL REFERENCES public."Repair Center"(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin', 'staff'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, repair_center_id)
);

-- Enable RLS on repair_center_staff
ALTER TABLE public.repair_center_staff ENABLE ROW LEVEL SECURITY;

-- Create policies for repair_center_staff
CREATE POLICY "Admins can manage all repair center staff" 
ON public.repair_center_staff 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Repair center admins can manage their staff" 
ON public.repair_center_staff 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs 
    WHERE rcs.user_id = auth.uid() 
    AND rcs.repair_center_id = repair_center_staff.repair_center_id 
    AND rcs.role = 'admin'
  )
);

CREATE POLICY "Staff can view their own record" 
ON public.repair_center_staff 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to check if user is repair center admin
CREATE OR REPLACE FUNCTION public.is_repair_center_admin(_user_id uuid, _repair_center_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.user_id = _user_id 
    AND rcs.repair_center_id = _repair_center_id 
    AND rcs.role = 'admin'
    AND rcs.is_active = true
  );
$$;

-- Create function to get user's repair center
CREATE OR REPLACE FUNCTION public.get_user_repair_center(_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT repair_center_id FROM public.repair_center_staff 
  WHERE user_id = _user_id AND is_active = true 
  LIMIT 1;
$$;

-- Update repair_jobs policies to include repair center staff access
DROP POLICY IF EXISTS "Users can view their own repair jobs" ON public.repair_jobs;
CREATE POLICY "Users and repair center staff can view relevant repair jobs" 
ON public.repair_jobs 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (repair_center_id = public.get_user_repair_center(auth.uid()))
);

DROP POLICY IF EXISTS "Users and admins can update repair jobs" ON public.repair_jobs;
CREATE POLICY "Users, admins and repair center staff can update relevant repair jobs" 
ON public.repair_jobs 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (repair_center_id = public.get_user_repair_center(auth.uid()))
);

-- Create trigger for updated_at
CREATE TRIGGER update_repair_center_staff_updated_at
  BEFORE UPDATE ON public.repair_center_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();