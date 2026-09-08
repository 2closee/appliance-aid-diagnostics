REVOKE EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) TO service_role;