CREATE TABLE public.shift_task_notes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  task_id uuid not null references public.shift_tasks(id) on delete cascade,
  task_date date not null,
  author_id uuid references auth.users(id),
  author_email text,
  note text not null,
  created_at timestamp with time zone not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_task_notes TO authenticated;
GRANT ALL ON public.shift_task_notes TO service_role;
ALTER TABLE public.shift_task_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their restaurant task notes" ON public.shift_task_notes FOR ALL TO authenticated USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())) WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Authenticated can read demo task notes" ON public.shift_task_notes FOR SELECT TO authenticated USING (restaurant_id = '11111111-1111-1111-1111-111111111111');
CREATE INDEX shift_task_notes_lookup ON public.shift_task_notes (restaurant_id, task_date);