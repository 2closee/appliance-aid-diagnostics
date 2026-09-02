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
          'info', 'conversation', v_conv.id
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
        'info', 'conversation', v_conv.id
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

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

  IF NEW.quoted_cost IS NOT NULL
     AND (OLD.quoted_cost IS NULL OR OLD.quoted_cost IS DISTINCT FROM NEW.quoted_cost)
     AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
      NEW.user_id,
      'Repair quote ready',
      coalesce(v_center_name, 'Your repair center') || ' quoted ₦' ||
        trim(to_char(NEW.quoted_cost, 'FM999G999G990D00')) || '. Review, negotiate or accept it now.',
      'alert', 'repair_job', NEW.id
    );
  END IF;

  IF OLD.job_status IS DISTINCT FROM NEW.job_status THEN
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
          'alert', 'repair_job', NEW.id
        );
      END LOOP;
    END IF;

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
        VALUES (NEW.user_id, v_title, v_body, 'info', 'repair_job', NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

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
      VALUES (v_ticket.user_id, 'Support replied', left(NEW.message, 140), 'alert', 'support_ticket', v_ticket.id);
    END IF;
  ELSE
    FOR v_admin IN
      SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'super_admin')
    LOOP
      IF v_admin.user_id <> coalesce(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
        VALUES (v_admin.user_id, 'New support ticket reply', left(NEW.message, 140), 'alert', 'support_ticket', v_ticket.id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.notify_conversation_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_repair_job_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_support_ticket_message() FROM PUBLIC, anon, authenticated;