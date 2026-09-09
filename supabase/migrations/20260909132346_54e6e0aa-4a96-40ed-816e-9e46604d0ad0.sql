-- Repair centre staff activity heartbeat
CREATE TABLE public.center_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repair_center_id bigint NOT NULL,
  context text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, repair_center_id)
);

GRANT SELECT ON public.center_activity TO authenticated;
GRANT ALL ON public.center_activity TO service_role;
ALTER TABLE public.center_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view center activity" ON public.center_activity
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff view own center activity" ON public.center_activity
FOR SELECT TO authenticated USING (is_staff_at_center(auth.uid(), repair_center_id));

CREATE TRIGGER update_center_activity_updated_at
BEFORE UPDATE ON public.center_activity
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_center_activity_center ON public.center_activity (repair_center_id, last_seen_at DESC);

-- Secure heartbeat writer
CREATE OR REPLACE FUNCTION public.touch_center_activity(_center_id bigint, _context text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT is_staff_at_center(auth.uid(), _center_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.center_activity (user_id, repair_center_id, context, last_seen_at)
  VALUES (auth.uid(), _center_id, _context, now())
  ON CONFLICT (user_id, repair_center_id) DO UPDATE
  SET last_seen_at = now(),
      context = COALESCE(EXCLUDED.context, public.center_activity.context),
      updated_at = now();
END;
$$;

-- Nudge log
CREATE TABLE public.center_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_center_id bigint NOT NULL,
  repair_job_id uuid,
  conversation_id uuid,
  reason text NOT NULL,
  message text,
  phone text,
  provider text,
  provider_ok boolean NOT NULL DEFAULT false,
  provider_error text,
  outcome text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.center_nudges TO authenticated;
GRANT ALL ON public.center_nudges TO service_role;
ALTER TABLE public.center_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view nudges" ON public.center_nudges
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_center_nudges_updated_at
BEFORE UPDATE ON public.center_nudges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_center_nudges_center_sent ON public.center_nudges (repair_center_id, sent_at DESC);
CREATE INDEX idx_center_nudges_job ON public.center_nudges (repair_job_id, reason);

-- Alert settings (single row)
CREATE TABLE public.admin_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  message_wait_minutes integer NOT NULL DEFAULT 15,
  quote_wait_minutes integer NOT NULL DEFAULT 30,
  online_window_minutes integer NOT NULL DEFAULT 10,
  working_hours_start integer NOT NULL DEFAULT 8,
  working_hours_end integer NOT NULL DEFAULT 20,
  max_per_center_per_hour integer NOT NULL DEFAULT 1,
  max_per_center_per_day integer NOT NULL DEFAULT 5,
  sms_template text NOT NULL DEFAULT 'FixBudi: a customer is waiting on you ({reason}). Log in to your partner dashboard now: {link}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_alert_settings TO authenticated;
GRANT ALL ON public.admin_alert_settings TO service_role;
ALTER TABLE public.admin_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view alert settings" ON public.admin_alert_settings
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update alert settings" ON public.admin_alert_settings
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_admin_alert_settings_updated_at
BEFORE UPDATE ON public.admin_alert_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.admin_alert_settings (id) VALUES (gen_random_uuid());

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events (user_id, created_at DESC);