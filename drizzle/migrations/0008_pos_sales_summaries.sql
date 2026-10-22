CREATE TABLE public.pos_sales_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'toast',
  start_date date NOT NULL,
  end_date date NOT NULL,
  data jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, platform, start_date, end_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_sales_summaries TO authenticated;
GRANT ALL ON public.pos_sales_summaries TO service_role;
ALTER TABLE public.pos_sales_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read pos summaries" ON public.pos_sales_summaries FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Managers insert pos summaries" ON public.pos_sales_summaries FOR INSERT TO authenticated WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers update pos summaries" ON public.pos_sales_summaries FOR UPDATE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers delete pos summaries" ON public.pos_sales_summaries FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));