CREATE OR REPLACE FUNCTION public.register_push_subscription(
  _token text,
  _platform text DEFAULT 'web',
  _device_label text DEFAULT NULL
)
RETURNS public.push_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_subscription public.push_subscriptions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(btrim(_token), '') IS NULL THEN
    RAISE EXCEPTION 'Push token is required';
  END IF;

  DELETE FROM public.push_subscriptions
  WHERE token = _token
    AND user_id <> v_user_id;

  INSERT INTO public.push_subscriptions (user_id, token, platform, device_label, last_seen_at)
  VALUES (
    v_user_id,
    _token,
    COALESCE(NULLIF(btrim(_platform), ''), 'web'),
    NULLIF(btrim(_device_label), ''),
    now()
  )
  ON CONFLICT (token) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      platform = EXCLUDED.platform,
      device_label = EXCLUDED.device_label,
      last_seen_at = now(),
      updated_at = now()
  RETURNING * INTO v_subscription;

  RETURN v_subscription;
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) TO service_role;