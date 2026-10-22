CREATE TABLE public.item_outages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'toast',
  item_name text NOT NULL,
  outage_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  reported_by uuid,
  reported_by_email text,
  back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_outages TO authenticated;
GRANT ALL ON public.item_outages TO service_role;
ALTER TABLE public.item_outages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read outages" ON public.item_outages FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Members log outages" ON public.item_outages FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_member(restaurant_id) AND reported_by = auth.uid());
CREATE POLICY "Members update outages" ON public.item_outages FOR UPDATE TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Managers delete outages" ON public.item_outages FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));