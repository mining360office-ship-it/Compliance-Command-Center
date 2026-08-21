CREATE TABLE IF NOT EXISTS public.compliances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sr_no SERIAL,
  title TEXT NOT NULL,
  authority TEXT NOT NULL,
  category TEXT,
  type TEXT,
  mine TEXT,
  lease TEXT,
  due_date DATE,
  completion_date DATE,
  responsible_person TEXT,
  department TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Upcoming',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  documents JSONB DEFAULT '[]'::jsonb,
  approval_workflow JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliances TO anon, authenticated;
GRANT ALL ON public.compliances TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.compliances_sr_no_seq TO anon, authenticated, service_role;

ALTER TABLE public.compliances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read compliances" ON public.compliances FOR SELECT USING (true);
CREATE POLICY "Public insert compliances" ON public.compliances FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update compliances" ON public.compliances FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete compliances" ON public.compliances FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_compliances_updated_at ON public.compliances;
CREATE TRIGGER update_compliances_updated_at
  BEFORE UPDATE ON public.compliances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();