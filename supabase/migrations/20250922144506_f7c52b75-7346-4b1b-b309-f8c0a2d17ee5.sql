-- Add admin role for the current user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('34132d93-81e7-4a89-b148-daa45f3f085d', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;