ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS vehicle_class text NOT NULL DEFAULT 'bike',
  ADD COLUMN IF NOT EXISTS carry_capability text NOT NULL DEFAULT 'gadget';

ALTER TABLE public.riders
  ADD CONSTRAINT riders_vehicle_class_check
  CHECK (vehicle_class IN ('bike','car','suv','van','truck'));

ALTER TABLE public.riders
  ADD CONSTRAINT riders_carry_capability_check
  CHECK (carry_capability IN ('gadget','bulky','both'));

UPDATE public.riders SET vehicle_class = 'bike', carry_capability = 'gadget'
WHERE vehicle_class IS NULL OR carry_capability IS NULL;

ALTER TABLE public.overpass_trips
  ADD COLUMN IF NOT EXISTS required_capability text NOT NULL DEFAULT 'gadget';

ALTER TABLE public.overpass_trips
  ADD CONSTRAINT overpass_trips_required_capability_check
  CHECK (required_capability IN ('gadget','bulky'));

UPDATE public.overpass_trips t
SET required_capability = 'bulky'
FROM public.repair_jobs j
WHERE j.id = t.repair_job_id AND j.logistics_category = 'bulky';