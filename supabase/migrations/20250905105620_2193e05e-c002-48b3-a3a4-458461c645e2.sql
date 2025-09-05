-- Secure the 'settings' table: restrict all operations to admins only
-- 1) Drop permissive policies
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public insert to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public delete to settings" ON public.settings;

-- Ensure RLS is enabled
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2) Admin-only policies for all operations using has_role()
CREATE POLICY "Admins can read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete settings"
ON public.settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));