ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS order_days smallint[] NOT NULL DEFAULT '{}';

WITH latest AS (
  SELECT i.inventory_item_id AS item_id,
         (array_agg(o.ordered_at ORDER BY o.ordered_at DESC))[1] AS ordered_at,
         (array_agg(i.quantity ORDER BY o.ordered_at DESC))[1] AS quantity
  FROM public.vendor_order_items i
  JOIN public.vendor_orders o ON o.id = i.vendor_order_id
  WHERE i.inventory_item_id IS NOT NULL
  GROUP BY i.inventory_item_id
)
UPDATE public.inventory_items ii
SET last_ordered_at = latest.ordered_at,
    last_ordered_quantity = latest.quantity
FROM latest
WHERE ii.id = latest.item_id
  AND (ii.last_ordered_at IS NULL OR ii.last_ordered_at < latest.ordered_at);