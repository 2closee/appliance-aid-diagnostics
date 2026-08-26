ALTER TABLE public.delivery_requests DROP CONSTRAINT IF EXISTS delivery_requests_provider_check;
ALTER TABLE public.delivery_requests ADD CONSTRAINT delivery_requests_provider_check
CHECK (provider IS NULL OR provider IN ('terminal_africa', 'fez', 'kwik', 'bolt', 'manual', 'overpass', 'ovapass'));

ALTER TABLE public.delivery_requests DROP CONSTRAINT IF EXISTS delivery_requests_provider_name_check;
ALTER TABLE public.delivery_requests ADD CONSTRAINT delivery_requests_provider_name_check
CHECK (provider_name IS NULL OR length(trim(provider_name)) > 0);