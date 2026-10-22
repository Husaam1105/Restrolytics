ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS payout numeric,
  ADD COLUMN IF NOT EXISTS fees numeric,
  ADD COLUMN IF NOT EXISTS promotions numeric,
  ADD COLUMN IF NOT EXISTS fulfillment text,
  ADD COLUMN IF NOT EXISTS payout_date date;
CREATE UNIQUE INDEX IF NOT EXISTS sales_platform_external_uidx ON public.sales (restaurant_id, platform, external_id);

ALTER TABLE public.day_issues ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS day_issues_platform_external_uidx ON public.day_issues (restaurant_id, platform, external_id);

CREATE TABLE public.platform_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL,
  reference_id text NOT NULL,
  payout_date date,
  order_count integer NOT NULL DEFAULT 0,
  sales numeric NOT NULL DEFAULT 0,
  fees numeric NOT NULL DEFAULT 0,
  promotions numeric NOT NULL DEFAULT 0,
  refunds numeric NOT NULL DEFAULT 0,
  other numeric NOT NULL DEFAULT 0,
  total_payout numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, platform, reference_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_payouts TO authenticated;
GRANT ALL ON public.platform_payouts TO service_role;
ALTER TABLE public.platform_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read payouts" ON public.platform_payouts FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Managers insert payouts" ON public.platform_payouts FOR INSERT TO authenticated WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers update payouts" ON public.platform_payouts FOR UPDATE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers delete payouts" ON public.platform_payouts FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));

CREATE TABLE public.platform_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL,
  order_id text NOT NULL,
  item_name text NOT NULL DEFAULT '',
  rating_date date,
  rating_value numeric,
  tags text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, platform, order_id, item_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_ratings TO authenticated;
GRANT ALL ON public.platform_ratings TO service_role;
ALTER TABLE public.platform_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read ratings" ON public.platform_ratings FOR SELECT TO authenticated USING (public.is_restaurant_member(restaurant_id));
CREATE POLICY "Managers insert ratings" ON public.platform_ratings FOR INSERT TO authenticated WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers update ratings" ON public.platform_ratings FOR UPDATE TO authenticated USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY "Managers delete ratings" ON public.platform_ratings FOR DELETE TO authenticated USING (public.can_manage_restaurant(restaurant_id));