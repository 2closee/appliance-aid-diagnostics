CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ovapass-retry-searching-trips') THEN
    PERFORM cron.unschedule('ovapass-retry-searching-trips');
  END IF;
END $$;

SELECT cron.schedule(
  'ovapass-retry-searching-trips',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://esbqtuljvejvrzawsqgk.supabase.co/functions/v1/overpass-assign',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'apikey', current_setting('app.settings.anon_key', true)
    ),
    body := '{"retry_searching":true}'::jsonb
  ) AS request_id;
  $$
);