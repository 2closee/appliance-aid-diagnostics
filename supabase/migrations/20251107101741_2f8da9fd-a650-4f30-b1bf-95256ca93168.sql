-- Create RPC function for secure branding updates
CREATE OR REPLACE FUNCTION update_repair_center_branding(
  _center_id BIGINT,
  _logo_url TEXT DEFAULT NULL,
  _cover_url TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is staff at this center
  IF NOT is_staff_at_center(auth.uid(), _center_id) THEN
    RAISE EXCEPTION 'Access denied: Not authorized for this repair center';
  END IF;

  -- Update only the provided fields
  IF _logo_url IS NOT NULL THEN
    UPDATE "Repair Center"
    SET logo_url = _logo_url, logo_updated_at = NOW()
    WHERE id = _center_id;
  END IF;

  IF _cover_url IS NOT NULL THEN
    UPDATE "Repair Center"
    SET cover_image_url = _cover_url, cover_image_updated_at = NOW()
    WHERE id = _center_id;
  END IF;
END;
$$;