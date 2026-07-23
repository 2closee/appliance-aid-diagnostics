
CREATE POLICY "Users upload own condition photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-condition-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users view own condition photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'delivery-condition-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Users delete own condition photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'delivery-condition-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
