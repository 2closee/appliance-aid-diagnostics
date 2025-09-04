-- Fix the user_roles policies (PostgreSQL doesn't support IF NOT EXISTS for policies)
CREATE POLICY "Users can view own roles or admins can view all"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));