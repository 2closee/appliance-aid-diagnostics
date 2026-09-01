CREATE OR REPLACE FUNCTION public.verify_push_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'push_dispatch_secret' AND decrypted_secret = _secret
  );
$$;

REVOKE EXECUTE ON FUNCTION public.verify_push_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_push_secret(text) TO service_role;