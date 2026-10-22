export type PortalType = "manual" | "woocommerce";

export type VendorPreset = {
  name: string;
  websiteUrl: string;
  loginUrl: string;
  ordersUrl: string;
  portalType: PortalType;
  cadenceDays: number;
  orderDays: number[];
};

export const VENDOR_PRESETS: VendorPreset[] = [
  {
    name: "Depot Deliveries",
    websiteUrl: "https://www.depotdeliveries.com",
    loginUrl: "https://www.depotdeliveries.com/my-account/",
    ordersUrl: "https://www.depotdeliveries.com/my-account/orders/",
    portalType: "woocommerce",
    cadenceDays: 1,
    orderDays: [1, 5],
  },
];

export type Vendor = {
  id: string;
  name: string;
  website_url: string | null;
  portal_type: string;
  login_url: string | null;
  orders_url: string | null;
  contact_email: string | null;
  order_cadence_days: number;
  order_days?: number[] | null;
  auto_sync: boolean;
  sync_status: string;
  last_synced_at: string | null;
  last_error: string | null;
  notes: string | null;
};

export type VendorItem = {
  id: string;
  name: string;
  unit: string;
  storage_area?: string | null;
  current_stock: number;
  par_level: number;
  reorder_level: number;
  cost_per_unit: number;
  quality_rating: number | null;
  last_ordered_at: string | null;
  last_ordered_quantity: number | null;
  reorder_interval_days: number;
  notes: string | null;
};

export type VendorOrder = {
  id: string;
  external_order_id: string | null;
  ordered_at: string;
  status: string;
  total: number;
  source: string;
  vendor_order_items: { id: string; name: string; quantity: number; unit_price: number }[];
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Mon, Fri" for a weekday schedule, or "every 3 days" when there is none. */
export function describeSchedule(vendor: Pick<Vendor, "order_cadence_days" | "order_days">) {
  const days = (vendor.order_days ?? []).slice().sort((a, b) => a - b);
  if (days.length > 0) return `orders ${days.map((d) => DAY_LABELS[d]).join(", ")}`;
  const n = vendor.order_cadence_days;
  return `orders every ${n} day${n === 1 ? "" : "s"}`;
}

export function nextOrderDate(
  item: Pick<VendorItem, "last_ordered_at" | "reorder_interval_days">,
  orderDays?: number[] | null,
) {
  if (!item.last_ordered_at) return null;
  const days = (orderDays ?? []).filter((d) => d >= 0 && d <= 6);
  const last = new Date(item.last_ordered_at);

  if (days.length > 0) {
    const next = new Date(last);
    for (let i = 1; i <= 7; i += 1) {
      next.setDate(last.getDate() + i);
      if (days.includes(next.getDay())) return next;
    }
    return next;
  }

  const next = new Date(last);
  next.setDate(next.getDate() + (item.reorder_interval_days || 7));
  return next;
}

export function orderUrgency(item: VendorItem, orderDays?: number[] | null): "overdue" | "due" | "ok" {
  const next = nextOrderDate(item, orderDays);
  const lowStock = item.current_stock <= item.reorder_level;
  if (!next) return lowStock ? "due" : "ok";
  const days = (next.getTime() - Date.now()) / 86_400_000;
  if (days < 0 || (lowStock && days < 1)) return "overdue";
  if (days <= 1 || lowStock) return "due";
  return "ok";
}

export function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
