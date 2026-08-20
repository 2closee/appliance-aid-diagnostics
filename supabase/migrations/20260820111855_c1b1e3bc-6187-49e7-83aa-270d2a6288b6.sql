REVOKE ALL ON FUNCTION public.touch_conversation_on_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_conversation_on_message() TO service_role;