REVOKE ALL ON FUNCTION public.dispatch_searching_ovapass_trips() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_searching_ovapass_trips() FROM anon;
REVOKE ALL ON FUNCTION public.dispatch_searching_ovapass_trips() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_searching_ovapass_trips() TO service_role;