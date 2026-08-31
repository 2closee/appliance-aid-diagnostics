-- 1. Push device tokens
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  device_label text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own push devices"
ON public.push_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Guided tour progress
CREATE TABLE public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tour_key text NOT NULL,
  completed_at timestamptz,
  skipped boolean NOT NULL DEFAULT false,
  last_step integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tour_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own onboarding progress"
ON public.user_onboarding FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_onboarding_updated_at
BEFORE UPDATE ON public.user_onboarding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Internal key used by the database to authenticate to the push sender
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_dispatch_secret') THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'push_dispatch_secret');
  END IF;
END $$;

-- 4. Fan out every notification row to the push sender
CREATE OR REPLACE FUNCTION public.dispatch_push_for_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'push_dispatch_secret' LIMIT 1;

  IF v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://esbqtuljvejvrzawsqgk.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

CREATE TRIGGER push_on_notification_insert
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_for_notification();

-- 5. Chat messages -> notification for the other side
CREATE OR REPLACE FUNCTION public.notify_conversation_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv record;
  v_center_name text;
  v_customer_name text;
  v_staff record;
BEGIN
  IF coalesce(NEW.is_auto_reply, false) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_conv IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_center_name FROM public."Repair Center" WHERE id = v_conv.repair_center_id;

  IF NEW.sender_type = 'customer' OR NEW.sender_id = v_conv.customer_id THEN
    SELECT coalesce(full_name, 'Customer') INTO v_customer_name FROM public.profiles WHERE id = v_conv.customer_id;
    FOR v_staff IN
      SELECT user_id FROM public.repair_center_staff
      WHERE repair_center_id = v_conv.repair_center_id AND is_active = true AND user_id IS NOT NULL
    LOOP
      IF v_staff.user_id <> NEW.sender_id THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
        VALUES (
          v_staff.user_id,
          'New message from ' || coalesce(v_customer_name, 'a customer'),
          left(NEW.content, 140),
          'message', 'conversation', v_conv.id
        );
      END IF;
    END LOOP;
  ELSE
    IF v_conv.customer_id IS NOT NULL AND v_conv.customer_id <> coalesce(NEW.sender_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
      VALUES (
        v_conv.customer_id,
        'New message from ' || coalesce(v_center_name, 'your repair center'),
        left(NEW.content, 140),
        'message', 'conversation', v_conv.id
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

CREATE TRIGGER notify_on_conversation_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_conversation_message();

-- 6. Job & quote updates -> notifications
CREATE OR REPLACE FUNCTION public.notify_repair_job_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_center_name text;
  v_staff record;
  v_title text;
  v_body text;
BEGIN
  SELECT name INTO v_center_name FROM public."Repair Center" WHERE id = NEW.repair_center_id;

  -- Quote sent to the customer
  IF NEW.quoted_cost IS NOT NULL
     AND (OLD.quoted_cost IS NULL OR OLD.quoted_cost IS DISTINCT FROM NEW.quoted_cost)
     AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
      NEW.user_id,
      'Repair quote ready',
      coalesce(v_center_name, 'Your repair center') || ' quoted ₦' ||
        trim(to_char(NEW.quoted_cost, 'FM999G999G990D00')) || '. Review, negotiate or accept it now.',
      'quote', 'repair_job', NEW.id
    );
  END IF;

  IF OLD.job_status IS DISTINCT FROM NEW.job_status THEN
    -- Tell the centre when the customer accepts or rejects
    IF NEW.job_status IN ('quote_accepted', 'quote_rejected', 'quote_negotiating') THEN
      FOR v_staff IN
        SELECT user_id FROM public.repair_center_staff
        WHERE repair_center_id = NEW.repair_center_id AND is_active = true AND user_id IS NOT NULL
      LOOP
        INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
        VALUES (
          v_staff.user_id,
          CASE NEW.job_status
            WHEN 'quote_accepted' THEN 'Quote accepted'
            WHEN 'quote_rejected' THEN 'Quote declined'
            ELSE 'Customer wants to negotiate'
          END,
          'Job #' || left(NEW.id::text, 8) || ' — open it to continue.',
          'quote', 'repair_job', NEW.id
        );
      END LOOP;
    END IF;

    -- Tell the customer about progress
    IF NEW.user_id IS NOT NULL THEN
      v_title := CASE NEW.job_status
        WHEN 'pickup_scheduled' THEN 'Pickup scheduled'
        WHEN 'picked_up' THEN 'Device picked up'
        WHEN 'in_repair' THEN 'Repair in progress'
        WHEN 'repair_completed' THEN 'Repair completed'
        WHEN 'ready_for_return' THEN 'Ready for return'
        WHEN 'returned' THEN 'Device returned'
        WHEN 'completed' THEN 'Job completed'
        WHEN 'cancelled' THEN 'Job cancelled'
        ELSE NULL
      END;
      IF v_title IS NOT NULL THEN
        v_body := coalesce(v_center_name, 'Your repair center') || ' updated job #' || left(NEW.id::text, 8) || '.';
        INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
        VALUES (NEW.user_id, v_title, v_body, 'job_status', 'repair_job', NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

CREATE TRIGGER notify_on_repair_job_change
AFTER UPDATE ON public.repair_jobs
FOR EACH ROW EXECUTE FUNCTION public.notify_repair_job_change();

-- 7. Support ticket replies -> notifications
CREATE OR REPLACE FUNCTION public.notify_support_ticket_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket record;
  v_admin record;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF v_ticket IS NULL THEN RETURN NEW; END IF;

  IF coalesce(NEW.is_staff_response, false) THEN
    IF v_ticket.user_id IS NOT NULL AND v_ticket.user_id <> coalesce(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
      VALUES (v_ticket.user_id, 'Support replied', left(NEW.message, 140), 'support', 'support_ticket', v_ticket.id);
    END IF;
  ELSE
    FOR v_admin IN
      SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'super_admin')
    LOOP
      IF v_admin.user_id <> coalesce(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
        VALUES (v_admin.user_id, 'New support ticket reply', left(NEW.message, 140), 'support', 'support_ticket', v_ticket.id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

CREATE TRIGGER notify_on_support_ticket_message
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_support_ticket_message();