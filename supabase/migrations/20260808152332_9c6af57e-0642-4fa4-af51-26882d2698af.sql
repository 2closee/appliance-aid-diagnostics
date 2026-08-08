CREATE POLICY "Riders upload own KYC files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'rider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Riders view own KYC files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rider-kyc'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Riders update own KYC files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'rider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Riders delete own KYC files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'rider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
