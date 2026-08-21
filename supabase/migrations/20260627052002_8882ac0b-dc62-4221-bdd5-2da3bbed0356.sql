
-- Inspections table
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_number TEXT,
  inspection_date DATE NOT NULL,
  authority TEXT NOT NULL,
  officer TEXT,
  mine TEXT,
  inspection_type TEXT,
  scope TEXT,
  overall_severity TEXT NOT NULL DEFAULT 'Medium',
  closure_status TEXT NOT NULL DEFAULT 'Open',
  closed_date DATE,
  summary TEXT,
  responsible_person TEXT,
  department TEXT,
  tags TEXT[],
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO anon, authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read inspections" ON public.inspections FOR SELECT USING (true);
CREATE POLICY "Public insert inspections" ON public.inspections FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update inspections" ON public.inspections FOR UPDATE USING (true);
CREATE POLICY "Public delete inspections" ON public.inspections FOR DELETE USING (true);

-- Observations table
CREATE TABLE public.inspection_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  observation TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Medium',
  corrective_action TEXT,
  target_date DATE,
  responsible_person TEXT,
  closure_status TEXT NOT NULL DEFAULT 'Open',
  closed_date DATE,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_observations TO anon, authenticated;
GRANT ALL ON public.inspection_observations TO service_role;
ALTER TABLE public.inspection_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read observations" ON public.inspection_observations FOR SELECT USING (true);
CREATE POLICY "Public insert observations" ON public.inspection_observations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update observations" ON public.inspection_observations FOR UPDATE USING (true);
CREATE POLICY "Public delete observations" ON public.inspection_observations FOR DELETE USING (true);

CREATE INDEX idx_obs_inspection ON public.inspection_observations(inspection_id);

-- Auto numbering
CREATE SEQUENCE IF NOT EXISTS public.inspections_seq START 1;

CREATE OR REPLACE FUNCTION public.inspections_set_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.inspection_number IS NULL OR NEW.inspection_number = '' THEN
    NEW.inspection_number := 'INS-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.inspections_seq')::text, 5, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inspections_defaults
BEFORE INSERT OR UPDATE ON public.inspections
FOR EACH ROW EXECUTE FUNCTION public.inspections_set_defaults();

CREATE TRIGGER trg_observations_updated
BEFORE UPDATE ON public.inspection_observations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
