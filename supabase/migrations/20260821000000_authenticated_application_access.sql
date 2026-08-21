-- MineCompli production authentication hardening.
-- No data is modified. This migration changes access policy only:
-- application tables and Storage writes require a valid Supabase Auth session.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'compliances',
    'notices',
    'inspections',
    'inspection_observations',
    'licenses',
    'authorities',
    'categories',
    'types',
    'mines',
    'leases',
    'departments',
    'responsible_persons',
    'priorities',
    'statuses',
    'recurring_rules',
    'documents',
    'users',
    'audit_logs',
    'system_settings'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- Existing application tables: preserve current CRUD behavior for authenticated users.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.compliances,
  public.notices,
  public.inspections,
  public.inspection_observations,
  public.licenses,
  public.authorities,
  public.categories,
  public.types,
  public.mines,
  public.leases,
  public.departments,
  public.responsible_persons,
  public.priorities,
  public.statuses,
  public.recurring_rules,
  public.documents,
  public.users
TO authenticated;

GRANT SELECT ON TABLE public.audit_logs TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.system_settings TO authenticated;

-- Auto-number sequences used by authenticated INSERTs.
GRANT USAGE, SELECT ON SEQUENCE public.compliances_sr_no_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.notices_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.inspections_seq TO authenticated, service_role;
REVOKE ALL PRIVILEGES ON SEQUENCE public.compliances_sr_no_seq FROM anon;
REVOKE ALL PRIVILEGES ON SEQUENCE public.notices_seq FROM anon;
REVOKE ALL PRIVILEGES ON SEQUENCE public.inspections_seq FROM anon;

-- Core application table policies.
DROP POLICY IF EXISTS "Public read compliances" ON public.compliances;
DROP POLICY IF EXISTS "Public insert compliances" ON public.compliances;
DROP POLICY IF EXISTS "Public update compliances" ON public.compliances;
DROP POLICY IF EXISTS "Public delete compliances" ON public.compliances;
CREATE POLICY "Authenticated read compliances" ON public.compliances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert compliances" ON public.compliances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update compliances" ON public.compliances FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete compliances" ON public.compliances FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read notices" ON public.notices;
DROP POLICY IF EXISTS "Public insert notices" ON public.notices;
DROP POLICY IF EXISTS "Public update notices" ON public.notices;
DROP POLICY IF EXISTS "Public delete notices" ON public.notices;
CREATE POLICY "Authenticated read notices" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert notices" ON public.notices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update notices" ON public.notices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete notices" ON public.notices FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Public insert inspections" ON public.inspections;
DROP POLICY IF EXISTS "Public update inspections" ON public.inspections;
DROP POLICY IF EXISTS "Public delete inspections" ON public.inspections;
CREATE POLICY "Authenticated read inspections" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update inspections" ON public.inspections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete inspections" ON public.inspections FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read observations" ON public.inspection_observations;
DROP POLICY IF EXISTS "Public insert observations" ON public.inspection_observations;
DROP POLICY IF EXISTS "Public update observations" ON public.inspection_observations;
DROP POLICY IF EXISTS "Public delete observations" ON public.inspection_observations;
CREATE POLICY "Authenticated read observations" ON public.inspection_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert observations" ON public.inspection_observations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update observations" ON public.inspection_observations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete observations" ON public.inspection_observations FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "licenses_select_all" ON public.licenses;
DROP POLICY IF EXISTS "licenses_insert_all" ON public.licenses;
DROP POLICY IF EXISTS "licenses_update_all" ON public.licenses;
DROP POLICY IF EXISTS "licenses_delete_all" ON public.licenses;
CREATE POLICY "Authenticated read licenses" ON public.licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update licenses" ON public.licenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete licenses" ON public.licenses FOR DELETE TO authenticated USING (true);

-- Master tables used throughout existing forms/settings.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'authorities', 'categories', 'types', 'mines', 'leases', 'departments',
    'responsible_persons', 'priorities', 'statuses', 'recurring_rules'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public read ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public write ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'Authenticated read ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'Authenticated write ' || t, t
    );
  END LOOP;
END $$;

-- Reconstructed application-support tables.
DROP POLICY IF EXISTS "Public read users" ON public.users;
DROP POLICY IF EXISTS "Public insert users" ON public.users;
DROP POLICY IF EXISTS "Public update users" ON public.users;
DROP POLICY IF EXISTS "Public delete users" ON public.users;
CREATE POLICY "Authenticated read users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update users" ON public.users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete users" ON public.users FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read documents" ON public.documents;
DROP POLICY IF EXISTS "Public insert documents" ON public.documents;
DROP POLICY IF EXISTS "Public update documents" ON public.documents;
DROP POLICY IF EXISTS "Public delete documents" ON public.documents;
CREATE POLICY "Authenticated read documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update documents" ON public.documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete documents" ON public.documents FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public update system settings" ON public.system_settings;
CREATE POLICY "Authenticated read system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update system settings" ON public.system_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Storage: require authenticated users for object operations while preserving
-- the existing bucket public/private settings and URL behavior.
DROP POLICY IF EXISTS "notice docs read" ON storage.objects;
DROP POLICY IF EXISTS "notice docs insert" ON storage.objects;
DROP POLICY IF EXISTS "notice docs update" ON storage.objects;
DROP POLICY IF EXISTS "notice docs delete" ON storage.objects;
CREATE POLICY "Authenticated notice docs read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'notice-documents');
CREATE POLICY "Authenticated notice docs insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notice-documents');
CREATE POLICY "Authenticated notice docs update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'notice-documents') WITH CHECK (bucket_id = 'notice-documents');
CREATE POLICY "Authenticated notice docs delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'notice-documents');

DROP POLICY IF EXISTS "Public read inspection evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public insert inspection evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public update inspection evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public delete inspection evidence" ON storage.objects;
CREATE POLICY "Authenticated inspection evidence read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'inspection-evidence');
CREATE POLICY "Authenticated inspection evidence insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inspection-evidence');
CREATE POLICY "Authenticated inspection evidence update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'inspection-evidence') WITH CHECK (bucket_id = 'inspection-evidence');
CREATE POLICY "Authenticated inspection evidence delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'inspection-evidence');

DROP POLICY IF EXISTS "document vault read" ON storage.objects;
DROP POLICY IF EXISTS "document vault insert" ON storage.objects;
DROP POLICY IF EXISTS "document vault update" ON storage.objects;
DROP POLICY IF EXISTS "document vault delete" ON storage.objects;
CREATE POLICY "Authenticated document vault read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Authenticated document vault insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Authenticated document vault update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Authenticated document vault delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
