import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { addDays } from "./payroll";
import { localNow, parseShiftSettings } from "./operating-day";
import { platformLabel } from "./sales";

type Client = SupabaseClient<Database>;

/** Active restaurant plus its timezone and today's local date. */
async function active(supabase: Client, userId: string) {
  const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
  const restaurant = await resolveActiveRestaurant(supabase, userId);
  const { timezone } = parseShiftSettings(restaurant.settings);
  return {
    restaurant,
    timezone,
    today: localNow(timezone).date,
    isManager: canManage(restaurant.role),
  };
}

async function dailySales(
  supabase: Client,
  restaurantId: string,
  from: string,
  to: string,
  timezone: string,
) {
  const { data, error } = await supabase.rpc("sales_daily", {
    _restaurant_id: restaurantId,
    _from: from,
    _to: to,
    _tz: timezone,
  });
  if (error) throw error;
  return data ?? [];
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { restaurant, timezone, today, isManager } = await active(
      context.supabase,
      context.userId,
    );

    const [rows, lowStock] = await Promise.all([
      isManager
        ? dailySales(context.supabase, restaurant.id, today, today, timezone)
        : Promise.resolve([]),
      context.supabase.rpc("low_stock_items", { _restaurant_id: restaurant.id, _limit: 500 }),
    ]);
    if (lowStock.error) throw lowStock.error;

    return {
      todayRevenue: rows.reduce((sum, r) => sum + Number(r.gross), 0),
      todayTips: rows.reduce((sum, r) => sum + Number(r.tips), 0),
      todayOrders: rows.reduce((sum, r) => sum + Number(r.orders), 0),
      lowStockCount: lowStock.data?.length ?? 0,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      role: restaurant.role,
      isManager,
      today,
    };
  });

export const getRecentSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { restaurant, isManager } = await active(context.supabase, context.userId);
    if (!isManager) return { sales: [] };

    const { data, error } = await context.supabase
      .from("sales")
      .select("id, platform, order_number, total, tax, tip, status, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return { sales: data ?? [] };
  });

export const getInventoryAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { restaurant } = await active(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("low_stock_items", {
      _restaurant_id: restaurant.id,
      _limit: 5,
    });
    if (error) throw error;
    return { items: data ?? [] };
  });

export const getSalesChartData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { restaurant, timezone, today, isManager } = await active(
      context.supabase,
      context.userId,
    );
    const days = 7;
    const from = addDays(today, -(days - 1));
    const rows = isManager
      ? await dailySales(context.supabase, restaurant.id, from, today, timezone)
      : [];

    const byDay = new Map<string, number>();
    for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + Number(r.gross));

    const points = Array.from({ length: days }, (_, i) => {
      const date = addDays(from, i);
      const label = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      });
      return { date, label, total: byDay.get(date) ?? 0 };
    });
    return { points };
  });

export const getPlatformBreakdown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { restaurant, timezone, today, isManager } = await active(
      context.supabase,
      context.userId,
    );
    const from = addDays(today, -29);
    const rows = isManager
      ? await dailySales(context.supabase, restaurant.id, from, today, timezone)
      : [];

    const totals = new Map<string, number>();
    for (const r of rows) totals.set(r.platform, (totals.get(r.platform) ?? 0) + Number(r.gross));

    return {
      from,
      to: today,
      data: [...totals.entries()]
        .map(([platform, total]) => ({ platform, label: platformLabel(platform), total }))
        .sort((a, b) => b.total - a.total),
    };
  });
