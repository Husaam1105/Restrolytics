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
