-- Security hardening and data-integrity fixes.
--
-- 1. Staff could UPDATE any column of their own payroll line (total, paid)
--    and time entries (minutes, clock_in). Replace with narrow paths.
-- 2. Manager threads/tasks could be moved between restaurants on UPDATE.
-- 3. Any member could delete checklist history.
-- 4. Managers couldn't re-send an invite (no UPDATE policy).
-- 5. Revenue tables were readable by every member, including staff.
-- 6. Server-side helpers for low stock, count completion and sales totals,
--    which the app previously did with broken or truncated client queries.

-- ---------------------------------------------------------------------------
-- Generic guard: rows never change restaurant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_restaurant_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id THEN
    RAISE EXCEPTION 'restaurant_id cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_items','sales','vendors','vendor_orders','vendor_order_items','platform_connections',
    'shift_tasks','shift_task_completions','shift_task_notes','employees','time_entries','tip_pools',
    'payroll_periods','payroll_lines','day_issues','staff_schedules','catering_orders','catering_payments',
    'storage_locations','item_locations','inventory_counts','inventory_count_lines','platform_payouts',
    'platform_ratings','pos_sales_summaries','item_outages','copilot_threads','manager_threads',
    'manager_tasks','manager_notes','restaurant_members','restaurant_invites'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %1$s_restaurant_immutable ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER %1$s_restaurant_immutable BEFORE UPDATE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.prevent_restaurant_change()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Rows that reference an employee (and a pay period) must reference one from
-- the same restaurant. Foreign keys alone only prove the row exists.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_employee_same_restaurant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = NEW.employee_id AND restaurant_id = NEW.restaurant_id) THEN
    RAISE EXCEPTION 'Employee belongs to a different restaurant' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME = 'payroll_lines' THEN
    IF NOT EXISTS (SELECT 1 FROM public.payroll_periods
                    WHERE id = (to_jsonb(NEW) ->> 'period_id')::uuid AND restaurant_id = NEW.restaurant_id) THEN
      RAISE EXCEPTION 'Pay week belongs to a different restaurant' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['time_entries','payroll_lines','staff_schedules'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %1$s_employee_same_restaurant ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER %1$s_employee_same_restaurant BEFORE INSERT OR UPDATE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.guard_employee_same_restaurant()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1a. Payroll: staff may only acknowledge a paid line, via RPC.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff acknowledge own pay" ON public.payroll_lines;

CREATE OR REPLACE FUNCTION public.acknowledge_pay(_line_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated int;
BEGIN
  UPDATE public.payroll_lines
     SET acknowledged_at = now()
   WHERE id = _line_id
     AND paid = true
     AND acknowledged_at IS NULL
     AND employee_id IN (SELECT public.my_employee_ids());
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated = 1;
END $$;
REVOKE EXECUTE ON FUNCTION public.acknowledge_pay(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_pay(uuid) TO authenticated;

-- Paid weeks are locked: lines in a paid period can't change except the
-- per-line paid flag (so a payout can be corrected) and staff acknowledgement.
CREATE OR REPLACE FUNCTION public.guard_paid_payroll_line()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payroll_periods p WHERE p.id = OLD.period_id AND p.status = 'paid')
     AND (NEW.hours, NEW.hourly_rate, NEW.wages, NEW.tips, NEW.adjustments, NEW.total, NEW.pay_method)
         IS DISTINCT FROM
         (OLD.hours, OLD.hourly_rate, OLD.wages, OLD.tips, OLD.adjustments, OLD.total, OLD.pay_method)
  THEN
    RAISE EXCEPTION 'This pay week is closed. Reopen it to make changes.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payroll_lines_paid_lock ON public.payroll_lines;
CREATE TRIGGER payroll_lines_paid_lock BEFORE UPDATE ON public.payroll_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_paid_payroll_line();

-- ---------------------------------------------------------------------------
-- 1b. Time entries: staff can only clock themselves in now and out now.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff close their own shift" ON public.time_entries;
CREATE POLICY "Staff close their own shift" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT public.my_employee_ids()) AND clock_out IS NULL)
  WITH CHECK (employee_id IN (SELECT public.my_employee_ids()));

CREATE OR REPLACE FUNCTION public.guard_staff_time_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Service role and managers are trusted.
  IF auth.uid() IS NULL OR public.can_manage_restaurant(NEW.restaurant_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.work_date NOT BETWEEN (now() AT TIME ZONE 'utc')::date - 1 AND (now() AT TIME ZONE 'utc')::date + 1 THEN
      RAISE EXCEPTION 'Clock-in date is out of range' USING ERRCODE = '42501';
    END IF;
    NEW.source := 'clock';
    NEW.clock_in := now();
    NEW.clock_out := NULL;
    NEW.minutes := 0;
    NEW.entered_by := auth.uid();
    RETURN NEW;
  END IF;

  -- UPDATE: closing an open shift is the only change staff may make.
  IF OLD.clock_out IS NOT NULL
     OR (NEW.employee_id, NEW.work_date, NEW.clock_in, NEW.source, NEW.entered_by)
        IS DISTINCT FROM (OLD.employee_id, OLD.work_date, OLD.clock_in, OLD.source, OLD.entered_by)
  THEN
    RAISE EXCEPTION 'Only clocking out is allowed' USING ERRCODE = '42501';
  END IF;
  NEW.clock_out := now();
  NEW.minutes := GREATEST(0, floor(extract(epoch FROM (NEW.clock_out - OLD.clock_in)) / 60))::int;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS time_entries_staff_guard ON public.time_entries;
CREATE TRIGGER time_entries_staff_guard BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_staff_time_entry();

-- One open shift per employee.
CREATE UNIQUE INDEX IF NOT EXISTS time_entries_one_open_shift
  ON public.time_entries (employee_id) WHERE clock_out IS NULL AND source = 'clock';

-- ---------------------------------------------------------------------------
-- 2. Manager threads/tasks: identity columns are immutable; assignees may
--    only complete their own task.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Touch threads" ON public.manager_threads;
CREATE POLICY "Touch threads" ON public.manager_threads FOR UPDATE TO authenticated
  USING (public.can_see_manager_thread(id))
  WITH CHECK (public.can_see_manager_thread(id));

CREATE OR REPLACE FUNCTION public.guard_manager_thread()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.kind, NEW.member_user_id) IS DISTINCT FROM (OLD.kind, OLD.member_user_id) THEN
    RAISE EXCEPTION 'Thread identity cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS manager_threads_identity ON public.manager_threads;
CREATE TRIGGER manager_threads_identity BEFORE UPDATE ON public.manager_threads
  FOR EACH ROW EXECUTE FUNCTION public.guard_manager_thread();

CREATE OR REPLACE FUNCTION public.guard_manager_task()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_staff() OR public.can_manage_restaurant(OLD.restaurant_id) THEN
    RETURN NEW;
  END IF;
  IF (NEW.assigned_to, NEW.assigned_name, NEW.title, NEW.details, NEW.due_date, NEW.created_by)
     IS DISTINCT FROM (OLD.assigned_to, OLD.assigned_name, OLD.title, OLD.details, OLD.due_date, OLD.created_by)
  THEN
    RAISE EXCEPTION 'You can only complete this task' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS manager_tasks_assignee_guard ON public.manager_tasks;
CREATE TRIGGER manager_tasks_assignee_guard BEFORE UPDATE ON public.manager_tasks
  FOR EACH ROW EXECUTE FUNCTION public.guard_manager_task();

-- ---------------------------------------------------------------------------
-- 3. Checklist history: only the person who ticked it, or a manager, can undo.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "members clear completions" ON public.shift_task_completions;
CREATE POLICY "authors or managers clear completions" ON public.shift_task_completions
  FOR DELETE TO authenticated
  USING (completed_by = auth.uid() OR public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS "members update completions" ON public.shift_task_completions;
CREATE POLICY "authors or managers update completions" ON public.shift_task_completions
  FOR UPDATE TO authenticated
  USING (completed_by = auth.uid() OR public.can_manage_restaurant(restaurant_id))
  WITH CHECK (completed_by = auth.uid() OR public.can_manage_restaurant(restaurant_id));

-- ---------------------------------------------------------------------------
-- 4. Invites can be re-sent / re-roled by managers.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "managers update invites" ON public.restaurant_invites;
CREATE POLICY "managers update invites" ON public.restaurant_invites
  FOR UPDATE TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (
    public.is_restaurant_owner(restaurant_id)
    OR (public.can_manage_restaurant(restaurant_id) AND role = 'staff')
  );

-- ---------------------------------------------------------------------------
-- 4b. Restrolytics is invite-only. New restaurants are created by
--     Restrolytics staff, or by an existing owner adding another location.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_create_restaurant()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_staff()
      OR EXISTS (SELECT 1 FROM public.restaurant_members WHERE user_id = auth.uid() AND role = 'owner')
$$;
REVOKE EXECUTE ON FUNCTION public.can_create_restaurant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_create_restaurant() TO authenticated, service_role;

DROP POLICY IF EXISTS "authenticated create restaurants" ON public.restaurants;
CREATE POLICY "owners and platform staff create restaurants" ON public.restaurants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.can_create_restaurant());

-- ---------------------------------------------------------------------------
-- 5. Money is for owners and managers.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "members read sales" ON public.sales;
CREATE POLICY "managers read sales" ON public.sales
  FOR SELECT TO authenticated USING (public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Members read payouts" ON public.platform_payouts;
CREATE POLICY "Managers read payouts" ON public.platform_payouts
  FOR SELECT TO authenticated USING (public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Members read pos summaries" ON public.pos_sales_summaries;
CREATE POLICY "Managers read pos summaries" ON public.pos_sales_summaries
  FOR SELECT TO authenticated USING (public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Members view catering payments" ON public.catering_payments;
CREATE POLICY "Managers view catering payments" ON public.catering_payments
  FOR SELECT TO authenticated USING (public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS "members read vendor_orders" ON public.vendor_orders;
CREATE POLICY "managers read vendor_orders" ON public.vendor_orders
  FOR SELECT TO authenticated USING (public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS "members read vendor_order_items" ON public.vendor_order_items;
CREATE POLICY "managers read vendor_order_items" ON public.vendor_order_items
  FOR SELECT TO authenticated USING (public.can_manage_restaurant(restaurant_id));

-- Legacy tables nothing writes to any more.
DROP TABLE IF EXISTS public.usage_logs;
DROP TABLE IF EXISTS public.inventory_transactions;

-- ---------------------------------------------------------------------------
-- 6a. Low stock (PostgREST can't compare two columns in a filter).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.low_stock_items(_restaurant_id uuid, _limit int DEFAULT 50)
RETURNS TABLE (id uuid, name text, unit text, current_stock numeric, reorder_level numeric, par_level numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT i.id, i.name, i.unit, i.current_stock, i.reorder_level, i.par_level
    FROM public.inventory_items i
   WHERE i.restaurant_id = _restaurant_id
     AND i.reorder_level > 0
     AND i.current_stock <= i.reorder_level
   ORDER BY (i.current_stock / NULLIF(i.reorder_level, 0)) ASC, i.name
   LIMIT GREATEST(1, LEAST(_limit, 500))
$$;
GRANT EXECUTE ON FUNCTION public.low_stock_items(uuid, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6b. Completing a stock count. Remember the last counted quantity per
--     location, and set an item's stock to the sum across its locations, so
--     counting one storage area no longer wipes stock held elsewhere.
-- ---------------------------------------------------------------------------
ALTER TABLE public.item_locations ADD COLUMN IF NOT EXISTS last_count numeric;
ALTER TABLE public.item_locations ADD COLUMN IF NOT EXISTS last_counted_at timestamptz;

CREATE OR REPLACE FUNCTION public.complete_inventory_count(_count_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.inventory_counts%ROWTYPE;
  total numeric;
BEGIN
  SELECT * INTO c FROM public.inventory_counts WHERE id = _count_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_restaurant_member(c.restaurant_id) THEN
    RAISE EXCEPTION 'Count not found' USING ERRCODE = '42501';
  END IF;
  IF c.status = 'completed' THEN
    RAISE EXCEPTION 'This count is already completed.';
  END IF;

  -- Only lines whose location and item belong to this count's restaurant.
  INSERT INTO public.item_locations (restaurant_id, location_id, inventory_item_id, last_count, last_counted_at)
  SELECT c.restaurant_id, l.location_id, l.inventory_item_id, l.quantity, now()
    FROM public.inventory_count_lines l
    JOIN public.storage_locations sl ON sl.id = l.location_id AND sl.restaurant_id = c.restaurant_id
    JOIN public.inventory_items ii ON ii.id = l.inventory_item_id AND ii.restaurant_id = c.restaurant_id
   WHERE l.count_id = _count_id AND l.restaurant_id = c.restaurant_id
  ON CONFLICT (location_id, inventory_item_id)
  DO UPDATE SET last_count = EXCLUDED.last_count, last_counted_at = EXCLUDED.last_counted_at
   WHERE public.item_locations.restaurant_id = c.restaurant_id;

  UPDATE public.inventory_items i
     SET current_stock = s.qty
    FROM (
      SELECT il.inventory_item_id, SUM(COALESCE(il.last_count, 0)) AS qty
        FROM public.item_locations il
       WHERE il.restaurant_id = c.restaurant_id
         AND il.inventory_item_id IN (SELECT inventory_item_id FROM public.inventory_count_lines WHERE count_id = _count_id)
       GROUP BY il.inventory_item_id
    ) s
   WHERE i.id = s.inventory_item_id AND i.restaurant_id = c.restaurant_id;

  SELECT COALESCE(SUM(quantity * unit_cost), 0) INTO total
    FROM public.inventory_count_lines WHERE count_id = _count_id AND restaurant_id = c.restaurant_id;

  UPDATE public.inventory_counts
     SET status = 'completed', completed_at = now(), total_value = total
   WHERE id = _count_id;
  RETURN total;
END $$;
-- Foreign keys only prove a row exists, not whose it is. Rows that link a
-- location and an item must stay inside one restaurant.
CREATE OR REPLACE FUNCTION public.guard_same_restaurant_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.storage_locations WHERE id = NEW.location_id AND restaurant_id = NEW.restaurant_id)
     OR NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE id = NEW.inventory_item_id AND restaurant_id = NEW.restaurant_id)
  THEN
    RAISE EXCEPTION 'Linked rows must belong to the same restaurant' USING ERRCODE = '42501';
  END IF;
  -- NEW.count_id only exists on count lines; plpgsql doesn't short-circuit, so branch.
  IF TG_TABLE_NAME = 'inventory_count_lines' THEN
    IF NOT EXISTS (SELECT 1 FROM public.inventory_counts
                    WHERE id = (to_jsonb(NEW) ->> 'count_id')::uuid AND restaurant_id = NEW.restaurant_id) THEN
      RAISE EXCEPTION 'Linked rows must belong to the same restaurant' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS inventory_count_lines_same_restaurant ON public.inventory_count_lines;
CREATE TRIGGER inventory_count_lines_same_restaurant BEFORE INSERT OR UPDATE ON public.inventory_count_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_same_restaurant_links();
DROP TRIGGER IF EXISTS item_locations_same_restaurant ON public.item_locations;
CREATE TRIGGER item_locations_same_restaurant BEFORE INSERT OR UPDATE ON public.item_locations
  FOR EACH ROW EXECUTE FUNCTION public.guard_same_restaurant_links();

REVOKE EXECUTE ON FUNCTION public.complete_inventory_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_inventory_count(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6c. Sales totals per local day and channel, computed in the database so
--     the API row cap can't truncate them. RLS on sales still applies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_daily(_restaurant_id uuid, _from date, _to date, _tz text DEFAULT 'UTC')
RETURNS TABLE (
  day date, platform text, orders bigint, failed bigint, gross numeric, tax numeric, tips numeric,
  fees numeric, promotions numeric, payout numeric, payout_orders bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH s AS (
    SELECT (created_at AT TIME ZONE _tz)::date AS day, platform, total, tax, tip, fees, promotions, payout,
           lower(status) IN ('refunded','cancelled','canceled','voided','void','error','failed') AS is_failed
      FROM public.sales
     WHERE restaurant_id = _restaurant_id
       AND created_at >= (_from::timestamp AT TIME ZONE _tz)
       AND created_at <  ((_to + 1)::timestamp AT TIME ZONE _tz)
  )
  SELECT day, platform,
         COUNT(*) FILTER (WHERE NOT is_failed),
         COUNT(*) FILTER (WHERE is_failed),
         COALESCE(SUM(total) FILTER (WHERE NOT is_failed), 0),
         COALESCE(SUM(tax) FILTER (WHERE NOT is_failed), 0),
         COALESCE(SUM(tip) FILTER (WHERE NOT is_failed), 0),
         COALESCE(SUM(fees) FILTER (WHERE NOT is_failed AND payout IS NOT NULL), 0),
         COALESCE(SUM(promotions) FILTER (WHERE NOT is_failed AND payout IS NOT NULL), 0),
         COALESCE(SUM(payout) FILTER (WHERE NOT is_failed), 0),
         COUNT(*) FILTER (WHERE NOT is_failed AND payout IS NOT NULL)
    FROM s
   GROUP BY day, platform
   ORDER BY day, platform
$$;
GRANT EXECUTE ON FUNCTION public.sales_daily(uuid, date, date, text) TO authenticated;
