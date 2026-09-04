CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'blog_cron_secret') THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'blog_cron_secret');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_blog_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'blog_cron_secret' AND decrypted_secret = _secret
  );
$$;

REVOKE EXECUTE ON FUNCTION public.verify_blog_secret(text) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.run_blog_agent_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'blog_cron_secret' LIMIT 1;

  IF v_secret IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url := 'https://esbqtuljvejvrzawsqgk.supabase.co/functions/v1/blog-agent',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-blog-secret', v_secret),
    body := '{}'::jsonb
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.run_blog_agent_job() FROM anon, authenticated, public;

SELECT cron.unschedule('fixbudi-blog-agent')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fixbudi-blog-agent');

SELECT cron.schedule('fixbudi-blog-agent', '0 8 * * 1,3,5', 'SELECT public.run_blog_agent_job();');