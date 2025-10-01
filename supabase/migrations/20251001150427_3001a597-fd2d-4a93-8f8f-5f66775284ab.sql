-- Create repair_center_applications table for storing applications separately
CREATE TABLE IF NOT EXISTS public.repair_center_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  operating_hours TEXT NOT NULL,
  specialties TEXT NOT NULL,
  number_of_staff INTEGER NOT NULL DEFAULT 0,
  years_in_business INTEGER NOT NULL DEFAULT 0,
  cac_name TEXT NOT NULL,
  cac_number TEXT NOT NULL,
  tax_id TEXT,
  website TEXT,
  certifications TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.repair_center_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (insert) an application
CREATE POLICY "Anyone can submit repair center applications"
  ON public.repair_center_applications
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.repair_center_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- Admins can update applications (for approval/rejection)
CREATE POLICY "Admins can update applications"
  ON public.repair_center_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_repair_center_applications_updated_at
  BEFORE UPDATE ON public.repair_center_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on email for faster lookups
CREATE INDEX idx_repair_center_applications_email ON public.repair_center_applications(email);
CREATE INDEX idx_repair_center_applications_status ON public.repair_center_applications(status);