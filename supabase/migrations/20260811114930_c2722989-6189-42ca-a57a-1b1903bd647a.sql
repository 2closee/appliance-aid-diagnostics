CREATE TABLE public.repair_center_purge_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id bigint NOT NULL,
  center_name text,
  center_email text,
  purged_by uuid,
  deleted_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.repair_center_purge_log TO authenticated;
GRANT ALL ON public.repair_center_purge_log TO service_role;

ALTER TABLE public.repair_center_purge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view purge log"
ON public.repair_center_purge_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_repair_center_purge_log_center ON public.repair_center_purge_log (center_id);