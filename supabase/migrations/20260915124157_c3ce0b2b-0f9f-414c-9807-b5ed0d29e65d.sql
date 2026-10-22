CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  area text NOT NULL DEFAULT 'foh' CHECK (area IN ('foh','boh','both')),
  position text,
  hourly_rate numeric NOT NULL DEFAULT 0,
  pay_method text NOT NULL DEFAULT 'cash' CHECK (pay_method IN ('cash','check','transfer')),
  tip_eligible boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Which employee records belong to the signed-in user (used by staff-facing policies)
CREATE OR REPLACE FUNCTION public.my_employee_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid()
$$;

CREATE POLICY "Managers manage employees" ON public.employees
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (public.can_manage_restaurant(restaurant_id));

CREATE POLICY "Staff view own employee record" ON public.employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  minutes integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('clock','manual')),
  note text,
  entered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX time_entries_lookup_idx ON public.time_entries (restaurant_id, work_date);
CREATE INDEX time_entries_employee_idx ON public.time_entries (employee_id, work_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage time entries" ON public.time_entries
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (public.can_manage_restaurant(restaurant_id));

CREATE POLICY "Staff view own time entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT public.my_employee_ids()));

CREATE POLICY "Staff clock themselves in" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (SELECT public.my_employee_ids())
    AND public.is_restaurant_member(restaurant_id)
  );

CREATE POLICY "Staff close their own shift" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT public.my_employee_ids()))
  WITH CHECK (employee_id IN (SELECT public.my_employee_ids()));

CREATE TABLE public.tip_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  pool_date date NOT NULL,
  area text NOT NULL DEFAULT 'all' CHECK (area IN ('foh','boh','all')),
  amount numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, pool_date, area)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tip_pools TO authenticated;
GRANT ALL ON public.tip_pools TO service_role;
ALTER TABLE public.tip_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage tip pools" ON public.tip_pools
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (public.can_manage_restaurant(restaurant_id));

CREATE TABLE public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','paid')),
  paid_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
GRANT ALL ON public.payroll_periods TO service_role;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage pay weeks" ON public.payroll_periods
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (public.can_manage_restaurant(restaurant_id));

CREATE POLICY "Members view pay weeks" ON public.payroll_periods
  FOR SELECT TO authenticated
  USING (public.is_restaurant_member(restaurant_id));

CREATE TABLE public.payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  hours numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  wages numeric NOT NULL DEFAULT 0,
  tips numeric NOT NULL DEFAULT 0,
  adjustments numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  pay_method text NOT NULL DEFAULT 'cash' CHECK (pay_method IN ('cash','check','transfer')),
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, employee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_lines TO authenticated;
GRANT ALL ON public.payroll_lines TO service_role;
ALTER TABLE public.payroll_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage payroll lines" ON public.payroll_lines
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (public.can_manage_restaurant(restaurant_id));

CREATE POLICY "Staff view own pay" ON public.payroll_lines
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT public.my_employee_ids()));

CREATE POLICY "Staff acknowledge own pay" ON public.payroll_lines
  FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT public.my_employee_ids()))
  WITH CHECK (employee_id IN (SELECT public.my_employee_ids()));

REVOKE EXECUTE ON FUNCTION public.my_employee_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_employee_ids() TO authenticated, service_role;

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tip_pools_updated_at BEFORE UPDATE ON public.tip_pools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payroll_lines_updated_at BEFORE UPDATE ON public.payroll_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();