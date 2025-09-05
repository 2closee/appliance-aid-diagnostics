-- Restrict access to 'Repair Center' to prevent public harvesting of contact info
-- 1) Drop overly permissive public policies
DROP POLICY IF EXISTS "Allow public read access to repair centers" ON public."Repair Center";
DROP POLICY IF EXISTS "Allow public insert to repair centers" ON public."Repair Center";
DROP POLICY IF EXISTS "Allow public update to repair centers" ON public."Repair Center";
DROP POLICY IF EXISTS "Allow public delete to repair centers" ON public."Repair Center";

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public."Repair Center" ENABLE ROW LEVEL SECURITY;

-- 2) Read access for authenticated users only
CREATE POLICY "Authenticated users can read repair centers"
ON public."Repair Center"
FOR SELECT
TO authenticated
USING (true);

-- 3) Admin-only write access via has_role()
CREATE POLICY "Admins can insert repair centers"
ON public."Repair Center"
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update repair centers"
ON public."Repair Center"
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete repair centers"
ON public."Repair Center"
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));