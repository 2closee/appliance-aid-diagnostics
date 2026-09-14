CREATE TABLE public.center_response_clocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_key text NOT NULL,
  customer_id uuid NOT NULL,
  repair_center_id bigint NOT NULL,
  conversation_id uuid,
  repair_job_id uuid,
  diagnostic_conversation_id uuid,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'running',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  answered_at timestamp with time zone,
  handed_off_to bigint,
  no_candidate_notified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.center_response_clocks TO authenticated;
GRANT ALL ON public.center_response_clocks TO service_role;

ALTER TABLE public.center_response_clocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view their own response clocks"
ON public.center_response_clocks FOR SELECT TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Centre staff view their clocks"
ON public.center_response_clocks FOR SELECT TO authenticated
USING (public.is_staff_at_center(auth.uid(), repair_center_id));

CREATE POLICY "Admins view all response clocks"
ON public.center_response_clocks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX center_response_clocks_one_running
ON public.center_response_clocks (request_key) WHERE status = 'running';

CREATE INDEX idx_center_response_clocks_expiry
ON public.center_response_clocks (expires_at) WHERE status = 'running';

CREATE INDEX idx_center_response_clocks_conversation
ON public.center_response_clocks (conversation_id);

CREATE TRIGGER update_center_response_clocks_updated_at
BEFORE UPDATE ON public.center_response_clocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS response_clock_id uuid,
  ADD COLUMN IF NOT EXISTS handoff_reason text;

ALTER TABLE public.admin_alert_settings
  ADD COLUMN IF NOT EXISTS response_window_minutes integer NOT NULL DEFAULT 60;

ALTER PUBLICATION supabase_realtime ADD TABLE public.center_response_clocks;