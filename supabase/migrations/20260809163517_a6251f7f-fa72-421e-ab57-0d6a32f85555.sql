CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name text,
  role text NOT NULL DEFAULT 'owner',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"
ON public.profiles
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  location text,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demo_or_owner CHECK (owner_id IS NOT NULL OR id = '11111111-1111-1111-1111-111111111111'::uuid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their restaurants"
ON public.restaurants
FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can read demo restaurant"
ON public.restaurants
FOR SELECT TO authenticated
USING (id = '11111111-1111-1111-1111-111111111111'::uuid);

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL,
  current_stock numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners manage their inventory"
ON public.inventory_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = inventory_items.restaurant_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = inventory_items.restaurant_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can read demo inventory"
ON public.inventory_items
FOR SELECT TO authenticated
USING (restaurant_id = '11111111-1111-1111-1111-111111111111'::uuid);

CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity numeric NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners manage their inventory transactions"
ON public.inventory_transactions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = inventory_transactions.restaurant_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = inventory_transactions.restaurant_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can read demo transactions"
ON public.inventory_transactions
FOR SELECT TO authenticated
USING (restaurant_id = '11111111-1111-1111-1111-111111111111'::uuid);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('pos', 'doordash', 'ubereats', 'grubhub', 'manual')),
  order_number text,
  total numeric NOT NULL,
  tax numeric NOT NULL DEFAULT 0,
  tip numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners manage their sales"
ON public.sales
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = sales.restaurant_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = sales.restaurant_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can read demo sales"
ON public.sales
FOR SELECT TO authenticated
USING (restaurant_id = '11111111-1111-1111-1111-111111111111'::uuid);

CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  quantity numeric NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_logs TO authenticated;
GRANT ALL ON public.usage_logs TO service_role;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners manage their usage logs"
ON public.usage_logs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = usage_logs.restaurant_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = usage_logs.restaurant_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can read demo usage logs"
ON public.usage_logs
FOR SELECT TO authenticated
USING (restaurant_id = '11111111-1111-1111-1111-111111111111'::uuid);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Demo data
INSERT INTO public.restaurants (id, owner_id, name, location, settings)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  NULL,
  'Demo Bistro',
  '123 Main St',
  '{"currency":"USD","timezone":"America/New_York"}'::jsonb
);

INSERT INTO public.inventory_items (id, restaurant_id, name, unit, current_stock, reorder_level, cost_per_unit)
VALUES
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'All-Purpose Flour', 'lb', 45, 10, 0.75),
  ('21111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Mozzarella Cheese', 'lb', 18, 8, 4.50),
  ('21111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Chicken Breast', 'lb', 22, 10, 5.25),
  ('21111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Olive Oil', 'L', 9, 3, 12.00),
  ('21111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'Tomato Sauce', 'L', 14, 5, 3.80);

INSERT INTO public.sales (id, restaurant_id, platform, order_number, total, tax, tip, status, created_at)
VALUES
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'pos', 'POS-1001', 48.50, 3.88, 0, 'completed', now() - interval '2 hours'),
  ('31111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'doordash', 'DD-8842', 32.75, 2.62, 4.00, 'completed', now() - interval '4 hours'),
  ('31111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'ubereats', 'UE-2291', 27.00, 2.16, 0, 'completed', now() - interval '6 hours'),
  ('31111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'grubhub', 'GH-5510', 41.20, 3.30, 6.00, 'completed', now() - interval '8 hours'),
  ('31111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'pos', 'POS-1002', 56.00, 4.48, 0, 'completed', now() - interval '10 hours'),
  ('31111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', 'doordash', 'DD-8843', 19.50, 1.56, 3.00, 'completed', now() - interval '1 day'),
  ('31111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111111', 'ubereats', 'UE-2292', 44.00, 3.52, 0, 'completed', now() - interval '1 day'),
  ('31111111-1111-1111-1111-111111111118', '11111111-1111-1111-1111-111111111111', 'pos', 'POS-1003', 62.50, 5.00, 0, 'completed', now() - interval '2 days');

INSERT INTO public.usage_logs (id, restaurant_id, inventory_item_id, sale_id, quantity, logged_at)
VALUES
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 1.5, now() - interval '2 hours'),
  ('41111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111112', '31111111-1111-1111-1111-111111111111', 0.75, now() - interval '2 hours'),
  ('41111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111113', '31111111-1111-1111-1111-111111111112', 1.0, now() - interval '4 hours'),
  ('41111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111115', '31111111-1111-1111-1111-111111111113', 0.5, now() - interval '6 hours'),
  ('41111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111114', '31111111-1111-1111-1111-111111111114', 0.2, now() - interval '8 hours'),
  ('41111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111115', 2.0, now() - interval '10 hours'),
  ('41111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111112', '31111111-1111-1111-1111-111111111116', 0.5, now() - interval '1 day'),
  ('41111111-1111-1111-1111-111111111118', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111113', '31111111-1111-1111-1111-111111111117', 1.25, now() - interval '1 day');

INSERT INTO public.inventory_transactions (id, restaurant_id, inventory_item_id, type, quantity, reason, created_at)
VALUES
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'in', 50, 'Opening stock', now() - interval '7 days'),
  ('51111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111112', 'in', 25, 'Opening stock', now() - interval '7 days'),
  ('51111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111113', 'in', 30, 'Opening stock', now() - interval '7 days'),
  ('51111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111114', 'in', 12, 'Opening stock', now() - interval '7 days'),
  ('51111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111115', 'in', 20, 'Opening stock', now() - interval '7 days');
