CREATE TABLE public.shift_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  area text NOT NULL CHECK (area IN ('foh','boh')),
  shift text NOT NULL CHECK (shift IN ('opening','closing')),
  title text NOT NULL,
  details text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_tasks TO authenticated;
GRANT ALL ON public.shift_tasks TO service_role;
ALTER TABLE public.shift_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their shift tasks" ON public.shift_tasks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = shift_tasks.restaurant_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = shift_tasks.restaurant_id AND r.owner_id = auth.uid()));

CREATE POLICY "Authenticated users can read demo shift tasks" ON public.shift_tasks FOR SELECT TO authenticated
USING (restaurant_id = '11111111-1111-1111-1111-111111111111'::uuid);

CREATE TRIGGER update_shift_tasks_updated_at BEFORE UPDATE ON public.shift_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shift_task_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.shift_tasks(id) ON DELETE CASCADE,
  task_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (task_id, task_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_task_completions TO authenticated;
GRANT ALL ON public.shift_task_completions TO service_role;
ALTER TABLE public.shift_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their shift task completions" ON public.shift_task_completions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = shift_task_completions.restaurant_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = shift_task_completions.restaurant_id AND r.owner_id = auth.uid()));

CREATE INDEX idx_shift_tasks_lookup ON public.shift_tasks (restaurant_id, area, shift, sort_order);
CREATE INDEX idx_shift_task_completions_date ON public.shift_task_completions (restaurant_id, task_date);

INSERT INTO public.shift_tasks (restaurant_id, area, shift, title, details, sort_order) VALUES
('11111111-1111-1111-1111-111111111111','foh','opening','Unlock doors and disarm alarm',NULL,1),
('11111111-1111-1111-1111-111111111111','foh','opening','Turn on lights, music and POS terminals',NULL,2),
('11111111-1111-1111-1111-111111111111','foh','opening','Count cash drawer and set float','Confirm starting float matches log',3),
('11111111-1111-1111-1111-111111111111','foh','opening','Wipe tables, set placemats and cutlery',NULL,4),
('11111111-1111-1111-1111-111111111111','foh','opening','Stock napkins, straws and to-go bags',NULL,5),
('11111111-1111-1111-1111-111111111111','foh','opening','Check delivery tablets are online','Uber Eats, DoorDash, Grubhub',6),
('11111111-1111-1111-1111-111111111111','foh','closing','Cash out drawer and drop deposit',NULL,1),
('11111111-1111-1111-1111-111111111111','foh','closing','Run end-of-day POS report',NULL,2),
('11111111-1111-1111-1111-111111111111','foh','closing','Wipe down tables, chairs and menus',NULL,3),
('11111111-1111-1111-1111-111111111111','foh','closing','Sweep and mop dining room',NULL,4),
('11111111-1111-1111-1111-111111111111','foh','closing','Take out trash and restock restrooms',NULL,5),
('11111111-1111-1111-1111-111111111111','foh','closing','Lock doors, set alarm, lights off',NULL,6),
('11111111-1111-1111-1111-111111111111','boh','opening','Turn on hoods, grills, fryers and ovens',NULL,1),
('11111111-1111-1111-1111-111111111111','boh','opening','Record walk-in and freezer temperatures',NULL,2),
('11111111-1111-1111-1111-111111111111','boh','opening','Check prep list and pull product',NULL,3),
('11111111-1111-1111-1111-111111111111','boh','opening','Date-label all prepped items',NULL,4),
('11111111-1111-1111-1111-111111111111','boh','opening','Check vendor deliveries against invoices',NULL,5),
('11111111-1111-1111-1111-111111111111','boh','opening','Sanitizer buckets filled and tested',NULL,6),
('11111111-1111-1111-1111-111111111111','boh','closing','Break down and clean line stations',NULL,1),
('11111111-1111-1111-1111-111111111111','boh','closing','Filter fryers and turn off equipment',NULL,2),
('11111111-1111-1111-1111-111111111111','boh','closing','Wrap, label and store all product',NULL,3),
('11111111-1111-1111-1111-111111111111','boh','closing','Run final dish load and clean sinks',NULL,4),
('11111111-1111-1111-1111-111111111111','boh','closing','Log closing cooler temperatures',NULL,5),
('11111111-1111-1111-1111-111111111111','boh','closing','Update prep and order list for tomorrow',NULL,6);