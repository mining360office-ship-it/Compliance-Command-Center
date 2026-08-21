
CREATE POLICY "Public read inspection evidence" ON storage.objects FOR SELECT USING (bucket_id = 'inspection-evidence');
CREATE POLICY "Public insert inspection evidence" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspection-evidence');
CREATE POLICY "Public update inspection evidence" ON storage.objects FOR UPDATE USING (bucket_id = 'inspection-evidence');
CREATE POLICY "Public delete inspection evidence" ON storage.objects FOR DELETE USING (bucket_id = 'inspection-evidence');
