ALTER TABLE public.shift_tasks
  ADD COLUMN IF NOT EXISTS input_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS input_label text,
  ADD COLUMN IF NOT EXISTS input_unit text;

ALTER TABLE public.shift_tasks
  ADD CONSTRAINT shift_tasks_input_type_check
  CHECK (input_type IN ('none','text','number','temperature'));

ALTER TABLE public.shift_task_completions
  ADD COLUMN IF NOT EXISTS value text;