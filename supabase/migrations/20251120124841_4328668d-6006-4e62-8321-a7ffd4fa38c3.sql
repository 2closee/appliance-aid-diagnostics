-- Fix security warnings: Add search_path to the second function
CREATE OR REPLACE FUNCTION update_delivery_commission_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cash_payment_status = 'confirmed' AND OLD.cash_payment_status != 'confirmed' THEN
    UPDATE delivery_commissions
    SET status = 'collected',
        updated_at = NOW()
    WHERE delivery_request_id = NEW.id;
  ELSIF NEW.cash_payment_status = 'disputed' THEN
    UPDATE delivery_commissions
    SET status = 'disputed',
        notes = 'Payment disputed by customer or driver',
        updated_at = NOW()
    WHERE delivery_request_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;