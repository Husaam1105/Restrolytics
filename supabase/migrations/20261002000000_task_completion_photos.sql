ALTER TABLE public.shift_task_completions ADD COLUMN IF NOT EXISTS photo_path text;

-- Private bucket for checklist photo proof (5 MB, images only).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-photos', 'task-photos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

-- Photos live at task-photos/<restaurant_id>/<task_id>/<date>/<file>; only members of that restaurant may read or write them.
CREATE POLICY "Members can read task photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-photos' AND public.is_restaurant_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can upload task photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-photos' AND public.is_restaurant_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can update task photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'task-photos' AND public.is_restaurant_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can delete task photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-photos' AND public.is_restaurant_member((storage.foldername(name))[1]::uuid));