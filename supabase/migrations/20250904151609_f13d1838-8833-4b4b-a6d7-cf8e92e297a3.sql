-- 1) Create roles infra safely
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Definer function to check roles (bypasses RLS, prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.role = _role
  );
$$;

-- 2) Tighten policies: drop overly permissive ones if they exist
DO $$ BEGIN
  -- Repair Center policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Repair Center' AND polname='Allow public read access to repair centers') THEN
    DROP POLICY "Allow public read access to repair centers" ON public."Repair Center";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Repair Center' AND polname='Allow public insert to repair centers') THEN
    DROP POLICY "Allow public insert to repair centers" ON public."Repair Center";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Repair Center' AND polname='Allow public update to repair centers') THEN
    DROP POLICY "Allow public update to repair centers" ON public."Repair Center";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Repair Center' AND polname='Allow public delete to repair centers') THEN
    DROP POLICY "Allow public delete to repair centers" ON public."Repair Center";
  END IF;

  -- settings policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='settings' AND polname='Allow public read access to settings') THEN
    DROP POLICY "Allow public read access to settings" ON public.settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='settings' AND polname='Allow public insert to settings') THEN
    DROP POLICY "Allow public insert to settings" ON public.settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='settings' AND polname='Allow public update to settings') THEN
    DROP POLICY "Allow public update to settings" ON public.settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='settings' AND polname='Allow public delete to settings') THEN
    DROP POLICY "Allow public delete to settings" ON public.settings;
  END IF;
END $$;

-- 3) Ensure RLS is enabled
ALTER TABLE public."Repair Center" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4) Create strict policies
-- Repair Center: public read-only
CREATE POLICY "Public can read repair centers"
ON public."Repair Center"
FOR SELECT
USING (true);

-- Repair Center: only admins can write
CREATE POLICY "Admins can insert repair centers"
ON public."Repair Center"
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update repair centers"
ON public."Repair Center"
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete repair centers"
ON public."Repair Center"
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- settings: admin-only for all operations
CREATE POLICY "Admins can select settings"
ON public.settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.settings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- user_roles table policies
CREATE POLICY IF NOT EXISTS "Users can view own roles or admins can view all"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
