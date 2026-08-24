-- Statutory Manpower module.
-- Adds only the new manpower records, related document metadata, and a private
-- Storage bucket required to keep these documents under authenticated access.
-- Existing authentication, Supabase project, existing tables/data, and existing
-- Storage buckets are not changed.

CREATE TABLE IF NOT EXISTS public.statutory_manpower (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mine_manager_name TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  statutory_rule TEXT,
  mine_id UUID REFERENCES public.mines(id) ON UPDATE CASCADE ON DELETE SET NULL,
  appointment_date DATE,
  qualification TEXT,
  experience_years NUMERIC(6,2) CHECK (experience_years IS NULL OR experience_years >= 0),
  certificate_number TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.statutory_manpower_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manpower_id UUID NOT NULL REFERENCES public.statutory_manpower(id) ON UPDATE CASCADE ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
  file_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS statutory_manpower_mine_id_idx ON public.statutory_manpower(mine_id);
CREATE INDEX IF NOT EXISTS statutory_manpower_department_idx ON public.statutory_manpower(department);
CREATE INDEX IF NOT EXISTS statutory_manpower_designation_idx ON public.statutory_manpower(designation);
CREATE INDEX IF NOT EXISTS statutory_manpower_status_idx ON public.statutory_manpower(status);
CREATE INDEX IF NOT EXISTS statutory_manpower_appointment_date_idx ON public.statutory_manpower(appointment_date);
CREATE INDEX IF NOT EXISTS statutory_manpower_documents_manpower_id_idx ON public.statutory_manpower_documents(manpower_id);
CREATE INDEX IF NOT EXISTS statutory_manpower_documents_uploaded_at_idx ON public.statutory_manpower_documents(uploaded_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.statutory_manpower;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.statutory_manpower
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.statutory_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_manpower_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.statutory_manpower FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.statutory_manpower_documents FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.statutory_manpower TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.statutory_manpower_documents TO authenticated;
GRANT ALL ON TABLE public.statutory_manpower TO service_role;
GRANT ALL ON TABLE public.statutory_manpower_documents TO service_role;

DROP POLICY IF EXISTS "Authenticated read statutory manpower" ON public.statutory_manpower;
DROP POLICY IF EXISTS "Authenticated insert statutory manpower" ON public.statutory_manpower;
DROP POLICY IF EXISTS "Authenticated update statutory manpower" ON public.statutory_manpower;
DROP POLICY IF EXISTS "Authenticated delete statutory manpower" ON public.statutory_manpower;
CREATE POLICY "Authenticated read statutory manpower" ON public.statutory_manpower FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert statutory manpower" ON public.statutory_manpower FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update statutory manpower" ON public.statutory_manpower FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete statutory manpower" ON public.statutory_manpower FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read statutory manpower documents" ON public.statutory_manpower_documents;
DROP POLICY IF EXISTS "Authenticated insert statutory manpower documents" ON public.statutory_manpower_documents;
DROP POLICY IF EXISTS "Authenticated update statutory manpower documents" ON public.statutory_manpower_documents;
DROP POLICY IF EXISTS "Authenticated delete statutory manpower documents" ON public.statutory_manpower_documents;
CREATE POLICY "Authenticated read statutory manpower documents" ON public.statutory_manpower_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert statutory manpower documents" ON public.statutory_manpower_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update statutory manpower documents" ON public.statutory_manpower_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete statutory manpower documents" ON public.statutory_manpower_documents FOR DELETE TO authenticated USING (true);

-- The current Document Vault bucket is public because that existing module uses
-- public URLs. Statutory Manpower documents must remain under authenticated
-- access, so this module follows the application's existing private-bucket +
-- signed-URL pattern used by other protected document/evidence modules.
INSERT INTO storage.buckets (id, name, public)
VALUES ('statutory-manpower-documents', 'statutory-manpower-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Authenticated statutory manpower docs read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated statutory manpower docs insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated statutory manpower docs update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated statutory manpower docs delete" ON storage.objects;
CREATE POLICY "Authenticated statutory manpower docs read" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'statutory-manpower-documents');
CREATE POLICY "Authenticated statutory manpower docs insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'statutory-manpower-documents');
CREATE POLICY "Authenticated statutory manpower docs update" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'statutory-manpower-documents') WITH CHECK (bucket_id = 'statutory-manpower-documents');
CREATE POLICY "Authenticated statutory manpower docs delete" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'statutory-manpower-documents');
