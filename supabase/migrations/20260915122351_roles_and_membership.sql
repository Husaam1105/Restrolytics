-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Membership
CREATE TABLE IF NOT EXISTS public.restaurant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  role public.app_role NOT NULL DEFAULT 'staff',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_members TO authenticated;
GRANT ALL ON public.restaurant_members TO service_role;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.restaurant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_invites TO authenticated;
GRANT ALL ON public.restaurant_invites TO service_role;
ALTER TABLE public.restaurant_invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_restaurant_members_updated_at BEFORE UPDATE ON public.restaurant_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurant_invites_updated_at BEFORE UPDATE ON public.restaurant_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Which restaurant a user is currently looking at
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS full_name text;

-- 4. Security-definer helpers
CREATE OR REPLACE FUNCTION public.restaurant_role(_restaurant_id uuid)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.restaurant_members
  WHERE restaurant_id = _restaurant_id AND user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE restaurant_id = _restaurant_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_restaurant(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE restaurant_id = _restaurant_id AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_owner(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE restaurant_id = _restaurant_id AND user_id = auth.uid() AND role = 'owner'
  )
$$;

-- 5. Replace every existing policy on tenant tables
DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'restaurants','profiles','inventory_items','inventory_transactions','sales','usage_logs',
    'vendors','vendor_orders','vendor_order_items','platform_connections',
    'shift_tasks','shift_task_completions','shift_task_notes'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Restaurants: creators become members via app logic
CREATE POLICY "members read their restaurants" ON public.restaurants
  FOR SELECT TO authenticated USING (public.is_restaurant_member(id) OR owner_id = auth.uid());
CREATE POLICY "authenticated create restaurants" ON public.restaurants
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners update their restaurants" ON public.restaurants
  FOR UPDATE TO authenticated USING (public.can_manage_restaurant(id));
CREATE POLICY "owners delete their restaurants" ON public.restaurants
  FOR DELETE TO authenticated USING (public.is_restaurant_owner(id));

-- Profiles: own row only
CREATE POLICY "own profile" ON public.profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Membership rows
CREATE POLICY "members read team" ON public.restaurant_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_restaurant_member(restaurant_id));
CREATE POLICY "managers add team" ON public.restaurant_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_restaurant_owner(restaurant_id)
    OR (public.can_manage_restaurant(restaurant_id) AND role = 'staff')
  );
CREATE POLICY "managers update team" ON public.restaurant_members
  FOR UPDATE TO authenticated
  USING (public.is_restaurant_owner(restaurant_id) OR (public.can_manage_restaurant(restaurant_id) AND role = 'staff'));
CREATE POLICY "managers remove team" ON public.restaurant_members
  FOR DELETE TO authenticated
  USING (public.is_restaurant_owner(restaurant_id) OR (public.can_manage_restaurant(restaurant_id) AND role = 'staff'));

-- Invites
CREATE POLICY "managers read invites" ON public.restaurant_invites
  FOR SELECT TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "managers create invites" ON public.restaurant_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_restaurant_owner(restaurant_id)
    OR (public.can_manage_restaurant(restaurant_id) AND role = 'staff')
  );
CREATE POLICY "managers delete invites" ON public.restaurant_invites
  FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));

-- Manager-managed operational tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_items','inventory_transactions','sales','usage_logs',
    'vendors','vendor_orders','vendor_order_items','platform_connections','shift_tasks'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "members read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id))', t);
    EXECUTE format(
      'CREATE POLICY "managers write %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.can_manage_restaurant(restaurant_id))', t);
    EXECUTE format(
      'CREATE POLICY "managers update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.can_manage_restaurant(restaurant_id))', t);
    EXECUTE format(
      'CREATE POLICY "managers delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id))', t);
  END LOOP;
END $$;

-- Checklist activity: any member of the restaurant
CREATE POLICY "members read completions" ON public.shift_task_completions
  FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members complete tasks" ON public.shift_task_completions
  FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members update completions" ON public.shift_task_completions
  FOR UPDATE TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members clear completions" ON public.shift_task_completions
  FOR DELETE TO authenticated USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "members read notes" ON public.shift_task_notes
  FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members add notes" ON public.shift_task_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_member(restaurant_id));
CREATE POLICY "authors delete notes" ON public.shift_task_notes
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.can_manage_restaurant(restaurant_id));

-- 6. Drop the old demo-restaurant escape hatch
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_owner_or_demo;
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_owner_id_check;