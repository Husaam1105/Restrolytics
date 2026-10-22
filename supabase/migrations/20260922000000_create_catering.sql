CREATE TABLE public.catering_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  contact text,
  event_date date NOT NULL,
  event_time text,
  headcount integer,
  location text,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'quoted' CHECK (status IN ('quoted','confirmed','delivered','cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catering_orders_restaurant_date_idx ON public.catering_orders (restaurant_id, event_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catering_orders TO authenticated;
GRANT ALL ON public.catering_orders TO service_role;

ALTER TABLE public.catering_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view catering orders" ON public.catering_orders
  FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Managers insert catering orders" ON public.catering_orders
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers update catering orders" ON public.catering_orders
  FOR UPDATE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers delete catering orders" ON public.catering_orders
  FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));

CREATE TRIGGER update_catering_orders_updated_at
  BEFORE UPDATE ON public.catering_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.catering_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.catering_orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','card','check','transfer','other')),
  paid_at date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catering_payments_order_idx ON public.catering_payments (order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catering_payments TO authenticated;
GRANT ALL ON public.catering_payments TO service_role;

ALTER TABLE public.catering_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view catering payments" ON public.catering_payments
  FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Managers insert catering payments" ON public.catering_payments
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers update catering payments" ON public.catering_payments
  FOR UPDATE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers delete catering payments" ON public.catering_payments
  FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));