
CREATE POLICY "own upload repo" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'repository' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "read repo objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'repository');
CREATE POLICY "own update repo" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'repository' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own delete repo" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'repository' AND (storage.foldername(name))[1] = auth.uid()::text);
