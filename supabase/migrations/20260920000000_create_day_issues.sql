CREATE TABLE public.day_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  business_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('void','refund','comp','waste','complaint','shortage','other')),
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL,
  platform text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX day_issues_restaurant_date_idx ON public.day_issues (restaurant_id, business_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_issues TO authenticated;
GRANT ALL ON public.day_issues TO service_role;

ALTER TABLE public.day_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view day issues"
ON public.day_issues FOR SELECT TO authenticated
USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Members log day issues"
ON public.day_issues FOR INSERT TO authenticated
WITH CHECK (public.is_restaurant_member(restaurant_id) AND created_by = auth.uid());

CREATE POLICY "Managers update day issues"
ON public.day_issues FOR UPDATE TO authenticated
USING (public.can_manage_restaurant(restaurant_id));

CREATE POLICY "Managers delete day issues"
ON public.day_issues FOR DELETE TO authenticated
USING (public.can_manage_restaurant(restaurant_id));