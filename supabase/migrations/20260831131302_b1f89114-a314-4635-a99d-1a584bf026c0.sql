REVOKE EXECUTE ON FUNCTION public.dispatch_push_for_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_conversation_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_repair_job_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_support_ticket_message() FROM PUBLIC, anon, authenticated;