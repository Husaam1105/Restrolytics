CREATE TABLE public.storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_locations TO authenticated;
GRANT ALL ON public.storage_locations TO service_role;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read locations" ON public.storage_locations FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "managers insert locations" ON public.storage_locations FOR INSERT TO authenticated WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "managers update locations" ON public.storage_locations FOR UPDATE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "managers delete locations" ON public.storage_locations FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE TRIGGER storage_locations_updated BEFORE UPDATE ON public.storage_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.item_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, inventory_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_locations TO authenticated;
GRANT ALL ON public.item_locations TO service_role;
ALTER TABLE public.item_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read item locations" ON public.item_locations FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "managers insert item locations" ON public.item_locations FOR INSERT TO authenticated WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "managers update item locations" ON public.item_locations FOR UPDATE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "managers delete item locations" ON public.item_locations FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));

CREATE TABLE public.inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  counted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  counted_by_email text,
  note text,
  total_value numeric NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_counts TO authenticated;
GRANT ALL ON public.inventory_counts TO service_role;
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read counts" ON public.inventory_counts FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members insert counts" ON public.inventory_counts FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members update counts" ON public.inventory_counts FOR UPDATE TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "managers delete counts" ON public.inventory_counts FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE TRIGGER inventory_counts_updated BEFORE UPDATE ON public.inventory_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventory_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  count_id uuid NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (count_id, location_id, inventory_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_count_lines TO authenticated;
GRANT ALL ON public.inventory_count_lines TO service_role;
ALTER TABLE public.inventory_count_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read count lines" ON public.inventory_count_lines FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members insert count lines" ON public.inventory_count_lines FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members update count lines" ON public.inventory_count_lines FOR UPDATE TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "members delete count lines" ON public.inventory_count_lines FOR DELETE TO authenticated USING (public.is_restaurant_member(restaurant_id));

INSERT INTO public.storage_locations (restaurant_id, name, sort_order)
SELECT r.id, v.name, v.ord FROM public.restaurants r
CROSS JOIN (VALUES ('Kitchen rack',1),('Walk-in cooler',2),('Freezer',3),('Under-counter drinks fridge',4),('Dry storage',5)) AS v(name, ord)
ON CONFLICT DO NOTHING;

INSERT INTO public.item_locations (restaurant_id, location_id, inventory_item_id)
SELECT i.restaurant_id, l.id, i.id FROM public.inventory_items i
JOIN public.storage_locations l ON l.restaurant_id = i.restaurant_id AND l.name = i.storage_area
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN public.inventory_items.storage_area IS 'DEPRECATED: replaced by item_locations';