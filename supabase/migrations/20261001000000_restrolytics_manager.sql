CREATE TABLE public.platform_staff (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_staff TO authenticated;
GRANT ALL ON public.platform_staff TO service_role;
ALTER TABLE public.platform_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own staff row" ON public.platform_staff FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_staff WHERE user_id = auth.uid())
$$;

-- Platform staff are granted per environment (see docs/setup.md), never seeded here.

-- Let Restrolytics staff see restaurant names and members
CREATE POLICY "Platform staff read restaurants" ON public.restaurants FOR SELECT TO authenticated USING (public.is_platform_staff());
CREATE POLICY "Platform staff read members" ON public.restaurant_members FOR SELECT TO authenticated USING (public.is_platform_staff());

CREATE TABLE public.manager_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('team','direct')),
  member_user_id uuid,
  member_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX manager_threads_team_uq ON public.manager_threads (restaurant_id) WHERE kind = 'team';
CREATE UNIQUE INDEX manager_threads_direct_uq ON public.manager_threads (restaurant_id, member_user_id) WHERE kind = 'direct';
GRANT SELECT, INSERT, UPDATE ON public.manager_threads TO authenticated;
GRANT ALL ON public.manager_threads TO service_role;
ALTER TABLE public.manager_threads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_see_manager_thread(_thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manager_threads t
    WHERE t.id = _thread_id AND (
      public.is_platform_staff()
      OR (t.kind = 'team' AND public.is_restaurant_member(t.restaurant_id))
      OR (t.kind = 'direct' AND t.member_user_id = auth.uid())
    )
  )
$$;

CREATE POLICY "View threads" ON public.manager_threads FOR SELECT TO authenticated USING (public.can_see_manager_thread(id));
CREATE POLICY "Create threads" ON public.manager_threads FOR INSERT TO authenticated WITH CHECK (
  public.is_platform_staff()
  OR (public.is_restaurant_member(restaurant_id) AND (kind = 'team' OR member_user_id = auth.uid()))
);
CREATE POLICY "Touch threads" ON public.manager_threads FOR UPDATE TO authenticated USING (public.can_see_manager_thread(id));

CREATE TABLE public.manager_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.manager_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_name text,
  from_manager boolean NOT NULL DEFAULT false,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX manager_messages_thread_idx ON public.manager_messages (thread_id, created_at);
GRANT SELECT, INSERT ON public.manager_messages TO authenticated;
GRANT ALL ON public.manager_messages TO service_role;
ALTER TABLE public.manager_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read messages" ON public.manager_messages FOR SELECT TO authenticated USING (public.can_see_manager_thread(thread_id));
CREATE POLICY "Send messages" ON public.manager_messages FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND public.can_see_manager_thread(thread_id)
  AND (from_manager = false OR public.is_platform_staff())
);

CREATE TABLE public.manager_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  assigned_to uuid,
  assigned_name text,
  title text NOT NULL,
  details text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  completion_note text,
  completed_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_tasks TO authenticated;
GRANT ALL ON public.manager_tasks TO service_role;
ALTER TABLE public.manager_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read tasks" ON public.manager_tasks FOR SELECT TO authenticated USING (
  public.is_platform_staff() OR public.can_manage_restaurant(restaurant_id) OR assigned_to = auth.uid()
  OR (assigned_to IS NULL AND public.is_restaurant_member(restaurant_id))
);
CREATE POLICY "Create tasks" ON public.manager_tasks FOR INSERT TO authenticated WITH CHECK (
  public.is_platform_staff() OR public.can_manage_restaurant(restaurant_id)
);
CREATE POLICY "Update tasks" ON public.manager_tasks FOR UPDATE TO authenticated USING (
  public.is_platform_staff() OR public.can_manage_restaurant(restaurant_id) OR assigned_to = auth.uid()
  OR (assigned_to IS NULL AND public.is_restaurant_member(restaurant_id))
);
CREATE POLICY "Delete tasks" ON public.manager_tasks FOR DELETE TO authenticated USING (
  public.is_platform_staff() OR public.can_manage_restaurant(restaurant_id)
);
CREATE TRIGGER update_manager_tasks_updated_at BEFORE UPDATE ON public.manager_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.manager_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_name text,
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.manager_notes TO authenticated;
GRANT ALL ON public.manager_notes TO service_role;
ALTER TABLE public.manager_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read notes" ON public.manager_notes FOR SELECT TO authenticated USING (
  author_id = auth.uid() OR public.is_platform_staff() OR public.can_manage_restaurant(restaurant_id)
);
CREATE POLICY "Log notes" ON public.manager_notes FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND public.is_restaurant_member(restaurant_id) AND status = 'open'
);
CREATE POLICY "Review notes" ON public.manager_notes FOR UPDATE TO authenticated USING (
  public.is_platform_staff() OR public.can_manage_restaurant(restaurant_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_notes;