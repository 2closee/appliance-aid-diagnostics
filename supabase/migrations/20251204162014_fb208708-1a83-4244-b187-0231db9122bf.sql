-- Fix search_path for get_settlement_period function
CREATE OR REPLACE FUNCTION public.get_settlement_period(date_input timestamp with time zone)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT TO_CHAR(date_input, 'IYYY-"W"IW');
$function$;

-- Fix search_path for update_repair_center_rating function
CREATE OR REPLACE FUNCTION public.update_repair_center_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE "Repair Center"
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM repair_center_reviews
      WHERE repair_center_id = NEW.repair_center_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM repair_center_reviews
      WHERE repair_center_id = NEW.repair_center_id
    )
  WHERE id = NEW.repair_center_id;
  RETURN NEW;
END;
$function$;