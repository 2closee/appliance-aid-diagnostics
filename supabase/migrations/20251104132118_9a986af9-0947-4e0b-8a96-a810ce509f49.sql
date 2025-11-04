-- Add branding columns to Repair Center table
ALTER TABLE "Repair Center"
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS logo_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cover_image_updated_at TIMESTAMP WITH TIME ZONE;

-- Create dedicated bucket for repair center branding
INSERT INTO storage.buckets (id, name, public)
VALUES ('repair-center-branding', 'repair-center-branding', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Repair center staff can upload branding
CREATE POLICY "Repair center staff can upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'repair-center-branding' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Repair Center" rc
    WHERE is_staff_at_center(auth.uid(), rc.id)
  )
);

-- RLS Policy: Anyone can view repair center branding
CREATE POLICY "Anyone can view repair center branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'repair-center-branding');

-- RLS Policy: Repair center staff can update their branding
CREATE POLICY "Repair center staff can update their branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'repair-center-branding'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Repair Center" rc
    WHERE is_staff_at_center(auth.uid(), rc.id)
  )
);

-- RLS Policy: Repair center staff can delete their branding
CREATE POLICY "Repair center staff can delete their branding"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'repair-center-branding'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Repair Center" rc
    WHERE is_staff_at_center(auth.uid(), rc.id)
  )
);