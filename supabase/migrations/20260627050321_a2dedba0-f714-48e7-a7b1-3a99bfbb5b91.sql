
DO $$
DECLARE t TEXT;
DECLARE tables TEXT[] := ARRAY[
  'authorities','categories','types','mines','leases','departments',
  'responsible_persons','priorities','statuses','recurring_rules'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public write %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "Public write %1$s" ON public.%1$I FOR ALL USING (true) WITH CHECK (true)', t);
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- Seed defaults (idempotent)
INSERT INTO public.authorities(name, sort_order) VALUES
 ('IBM',1),('DGMS',2),('MoEFCC',3),('SPCB',4),('Forest',5),('PESO',6),('Revenue',7),('Labour',8),('State Mining',9),('Other',10)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.priorities(name, sort_order) VALUES
 ('Critical',1),('High',2),('Medium',3),('Low',4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.statuses(name, sort_order) VALUES
 ('Upcoming',1),('In Progress',2),('Submitted',3),('Approved',4),('Completed',5),('Overdue',6),('Escalated',7),('Cancelled',8)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.departments(name, sort_order) VALUES
 ('Mining',1),('Environment',2),('Safety',3),('Legal',4),('HR',5),('Finance',6),('Operations',7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.mines(name, sort_order) VALUES
 ('Block A-12',1),('Block B-7',2),('Block C-3',3),('Block D-9',4),('Block E-1',5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories(name, sort_order) VALUES
 ('Return',1),('Report',2),('Payment',3),('Renewal',4),('Inspection',5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.types(name, sort_order) VALUES
 ('Monthly Return',1),('Quarterly Report',2),('Annual Report',3),('Cess Payment',4),('License Renewal',5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.recurring_rules(name, sort_order) VALUES
 ('Monthly',1),('Quarterly',2),('Half-Yearly',3),('Yearly',4),('Custom',5)
ON CONFLICT (name) DO NOTHING;
