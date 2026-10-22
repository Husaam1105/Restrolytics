CREATE TABLE public.staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  area TEXT NOT NULL DEFAULT 'foh' CHECK (area IN ('foh','boh','both')),
  shift TEXT NOT NULL DEFAULT 'opening' CHECK (shift IN ('opening','closing','mid','all-day')),
  start_time TEXT,
  end_time TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX staff_schedules_lookup_idx ON public.staff_schedules (restaurant_id, shift_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_schedules TO authenticated;
GRANT ALL ON public.staff_schedules TO service_role;

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their restaurant schedule"
  ON public.staff_schedules FOR SELECT TO authenticated
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Managers can insert schedule"
  ON public.staff_schedules FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_restaurant(restaurant_id));

CREATE POLICY "Managers can update schedule"
  ON public.staff_schedules FOR UPDATE TO authenticated
  USING (public.can_manage_restaurant(restaurant_id));

CREATE POLICY "Managers can delete schedule"
  ON public.staff_schedules FOR DELETE TO authenticated
  USING (public.can_manage_restaurant(restaurant_id));

CREATE TRIGGER staff_schedules_updated_at
  BEFORE UPDATE ON public.staff_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();