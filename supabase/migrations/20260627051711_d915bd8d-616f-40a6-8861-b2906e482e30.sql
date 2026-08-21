
CREATE POLICY "notice docs read" ON storage.objects FOR SELECT USING (bucket_id = 'notice-documents');
CREATE POLICY "notice docs insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notice-documents');
CREATE POLICY "notice docs update" ON storage.objects FOR UPDATE USING (bucket_id = 'notice-documents');
CREATE POLICY "notice docs delete" ON storage.objects FOR DELETE USING (bucket_id = 'notice-documents');
