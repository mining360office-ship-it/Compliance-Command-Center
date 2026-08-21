CREATE TABLE IF NOT EXISTS public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_name text NOT NULL,
  license_number text,
  authority text,
  mine text,
  issue_date date,
  expiry_date date,
  renewal_date date,
  status text NOT NULL DEFAULT 'Active',
  responsible_person text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenses TO anon, authenticated;
GRANT ALL ON public.licenses TO service_role;

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "licenses_select_all" ON public.licenses FOR SELECT USING (true);
CREATE POLICY "licenses_insert_all" ON public.licenses FOR INSERT WITH CHECK (true);
CREATE POLICY "licenses_update_all" ON public.licenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "licenses_delete_all" ON public.licenses FOR DELETE USING (true);

CREATE TRIGGER licenses_set_updated_at
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();