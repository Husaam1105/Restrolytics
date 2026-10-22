-- Vendors
CREATE TABLE public.vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  website_url text,
  portal_type text NOT NULL DEFAULT 'manual',
  login_url text,
  orders_url text,
  contact_email text,
  order_cadence_days integer NOT NULL DEFAULT 7,
  auto_sync boolean NOT NULL DEFAULT false,
  sync_status text NOT NULL DEFAULT 'not_configured',
  last_synced_at timestamptz,
  last_error text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their vendors" ON public.vendors FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = vendors.restaurant_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = vendors.restaurant_id AND r.owner_id = auth.uid()));

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendor portal credentials (service role only)
CREATE TABLE public.vendor_credentials (
  vendor_id uuid NOT NULL PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vendor_credentials TO service_role;
ALTER TABLE public.vendor_credentials ENABLE ROW LEVEL SECURITY;

-- Vendor orders
CREATE TABLE public.vendor_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  external_order_id text,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'completed',
  total numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, external_order_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_orders TO authenticated;
GRANT ALL ON public.vendor_orders TO service_role;
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their vendor orders" ON public.vendor_orders FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = vendor_orders.restaurant_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = vendor_orders.restaurant_id AND r.owner_id = auth.uid()));

CREATE TRIGGER update_vendor_orders_updated_at BEFORE UPDATE ON public.vendor_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendor order line items
CREATE TABLE public.vendor_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  vendor_order_id uuid NOT NULL REFERENCES public.vendor_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_order_items TO authenticated;
GRANT ALL ON public.vendor_order_items TO service_role;
ALTER TABLE public.vendor_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their vendor order items" ON public.vendor_order_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = vendor_order_items.restaurant_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = vendor_order_items.restaurant_id AND r.owner_id = auth.uid()));

-- Inventory item extensions
ALTER TABLE public.inventory_items
  ADD COLUMN vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN par_level numeric NOT NULL DEFAULT 0,
  ADD COLUMN quality_rating integer,
  ADD COLUMN last_ordered_at timestamptz,
  ADD COLUMN last_ordered_quantity numeric,
  ADD COLUMN reorder_interval_days integer NOT NULL DEFAULT 7,
  ADD COLUMN notes text;

CREATE UNIQUE INDEX inventory_items_restaurant_name_key
  ON public.inventory_items (restaurant_id, lower(name));
