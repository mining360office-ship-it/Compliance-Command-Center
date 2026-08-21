-- Fresh-backend completion for the existing Compliance application.
-- This migration creates only schema/configuration required by the current UI.
-- It intentionally migrates NO historical users, business records, audit history,
-- system-setting values, document metadata, or Storage objects.

-- -----------------------------------------------------------------------------
-- Missing application tables documented by the repository and used by routes.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'Compliance Officer',
  status TEXT NOT NULL DEFAULT 'Active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  folder TEXT,
  document_type TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_url TEXT,
  version INTEGER DEFAULT 1,
  upload_date TIMESTAMPTZ,
  uploaded_by TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  tags TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Keep timestamp behavior consistent with the rest of the application schema.
DROP TRIGGER IF EXISTS documents_set_updated_at ON public.documents;
CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS system_settings_set_updated_at ON public.system_settings;
CREATE TRIGGER system_settings_set_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- RLS: preserve only the anonymous operations the current frontend actually uses.
-- No auth.uid()/RBAC model is invented here because the current application has
-- no enforced login/role guard and its existing committed tables use public RLS.
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO anon, authenticated;
GRANT SELECT ON public.audit_logs TO anon, authenticated;
GRANT SELECT, UPDATE ON public.system_settings TO anon, authenticated;

GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.system_settings TO service_role;

DROP POLICY IF EXISTS "Public read users" ON public.users;
DROP POLICY IF EXISTS "Public insert users" ON public.users;
DROP POLICY IF EXISTS "Public update users" ON public.users;
DROP POLICY IF EXISTS "Public delete users" ON public.users;
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete users" ON public.users FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read documents" ON public.documents;
DROP POLICY IF EXISTS "Public insert documents" ON public.documents;
DROP POLICY IF EXISTS "Public update documents" ON public.documents;
DROP POLICY IF EXISTS "Public delete documents" ON public.documents;
CREATE POLICY "Public read documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Public insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update documents" ON public.documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete documents" ON public.documents FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read audit logs" ON public.audit_logs;
CREATE POLICY "Public read audit logs" ON public.audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public update system settings" ON public.system_settings;
CREATE POLICY "Public read system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Public update system settings" ON public.system_settings FOR UPDATE USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Fresh Storage buckets. No objects are copied from the old project.
-- documents is public because the current Document Vault uses getPublicUrl().
-- notice-documents and inspection-evidence remain private and use signed URLs.
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('notice-documents', 'notice-documents', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-evidence', 'inspection-evidence', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "document vault read" ON storage.objects;
DROP POLICY IF EXISTS "document vault insert" ON storage.objects;
DROP POLICY IF EXISTS "document vault update" ON storage.objects;
DROP POLICY IF EXISTS "document vault delete" ON storage.objects;
CREATE POLICY "document vault read" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "document vault insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "document vault update" ON storage.objects FOR UPDATE USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
CREATE POLICY "document vault delete" ON storage.objects FOR DELETE USING (bucket_id = 'documents');

-- Existing migrations already define equivalent Storage policies for
-- notice-documents and inspection-evidence.

-- -----------------------------------------------------------------------------
-- Realtime: the dashboard listens for changes on these three tables.
-- Add them idempotently to the standard Supabase Realtime publication.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'compliances'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.compliances;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'licenses'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.licenses;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inspections'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
    END IF;
  END IF;
END $$;
