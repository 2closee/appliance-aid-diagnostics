-- Update commission calculation function to 7.5%
CREATE OR REPLACE FUNCTION public.calculate_app_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate 7.5% commission when final_cost is set
    IF NEW.final_cost IS NOT NULL AND (OLD.final_cost IS NULL OR OLD.final_cost != NEW.final_cost) THEN
        NEW.app_commission = NEW.final_cost * 0.075;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;