
CREATE SEQUENCE IF NOT EXISTS public.notices_seq START 1;

CREATE TABLE public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  authority TEXT NOT NULL,
  mine TEXT,
  received_date DATE NOT NULL,
  reply_period_days INTEGER NOT NULL DEFAULT 30,
  reply_due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  risk_level TEXT NOT NULL DEFAULT 'Medium',
  reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[1,3,7,15,30],
  reminder_dates DATE[] NOT NULL DEFAULT ARRAY[]::DATE[],
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_remarks TEXT,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsible_person TEXT,
  department TEXT,
  tags TEXT[],
  closed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO anon, authenticated;
GRANT ALL ON public.notices TO service_role;
GRANT USAGE ON SEQUENCE public.notices_seq TO anon, authenticated, service_role;

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read notices" ON public.notices FOR SELECT USING (true);
CREATE POLICY "Public insert notices" ON public.notices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notices" ON public.notices FOR UPDATE USING (true);
CREATE POLICY "Public delete notices" ON public.notices FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.notices_set_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  d DATE;
  acc DATE[] := ARRAY[]::DATE[];
  n INTEGER;
BEGIN
  IF NEW.notice_number IS NULL OR NEW.notice_number = '' THEN
    NEW.notice_number := 'NTC-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.notices_seq')::text, 5, '0');
  END IF;
  IF NEW.reply_due_date IS NULL THEN
    NEW.reply_due_date := NEW.received_date + (COALESCE(NEW.reply_period_days, 30) || ' days')::INTERVAL;
  END IF;
  IF NEW.reminder_days IS NOT NULL AND array_length(NEW.reminder_days, 1) IS NOT NULL THEN
    FOREACH n IN ARRAY NEW.reminder_days LOOP
      d := NEW.reply_due_date - (n || ' days')::INTERVAL;
      acc := acc || d;
    END LOOP;
    NEW.reminder_dates := acc;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notices_before_insert
BEFORE INSERT ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notices_set_defaults();

CREATE TRIGGER notices_before_update
BEFORE UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notices_set_defaults();

CREATE INDEX notices_status_idx ON public.notices(status);
CREATE INDEX notices_authority_idx ON public.notices(authority);
CREATE INDEX notices_reply_due_idx ON public.notices(reply_due_date);
