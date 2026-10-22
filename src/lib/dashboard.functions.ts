import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function active(supabase: any, userId: string) {
  const { resolveActiveRestaurant } = await import("./tenant.server");
  return resolveActiveRestaurant(supabase, userId);
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const restaurant = await active(supabase, userId);
    const restaurantId = restaurant.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todaySales } = await supabase
      .from("sales")
      .select("total, tip")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", todayStart.toISOString());

    const { data: activeSales } = await supabase
      .from("sales")
      .select("id", { count: "exact" })
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: lowStockItems } = await supabase
      .from("inventory_items")
      .select("id", { count: "exact" })
      .eq("restaurant_id", restaurantId)
      .lte("current_stock", "reorder_level");

    const todayRevenue = todaySales?.reduce((sum, s) => sum + (s.total ?? 0), 0) ?? 0;
    const todayTips = todaySales?.reduce((sum, s) => sum + (s.tip ?? 0), 0) ?? 0;

    return {
      todayRevenue,
      todayTips,
      activeOrders: activeSales?.length ?? 0,
      lowStockCount: lowStockItems?.length ?? 0,
      restaurantId,
      restaurantName: restaurant.name,
      role: restaurant.role,
      isDemo: false,
    };
  });

export const getRecentSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const restaurant = await active(supabase, userId);

    const { data: sales } = await supabase
      .from("sales")
      .select("id, platform, order_number, total, tax, tip, status, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return { sales: sales ?? [], isDemo: false };
  });

export const getInventoryAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const restaurant = await active(supabase, userId);

    const { data: items } = await supabase
      .from("inventory_items")
      .select("id, name, unit, current_stock, reorder_level")
      .eq("restaurant_id", restaurant.id)
      .lte("current_stock", "reorder_level")
      .order("current_stock", { ascending: true })
      .limit(5);

    return { items: items ?? [], isDemo: false };
  });

export const getSalesChartData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const restaurant = await active(supabase, userId);

    const days = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const { data: sales } = await supabase
      .from("sales")
      .select("total, created_at")
      .eq("restaurant_id", restaurant.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    const labels: string[] = [];
    const values: number[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
      const sum =
        sales
          ?.filter((s) => {
            const saleDate = new Date(s.created_at);
            return (
              saleDate.getFullYear() === d.getFullYear() &&
              saleDate.getMonth() === d.getMonth() &&
              saleDate.getDate() === d.getDate()
            );
          })
          .reduce((acc, s) => acc + (s.total ?? 0), 0) ?? 0;
      values.push(sum);
    }

    return { labels, values, isDemo: false };
  });

export const getPlatformBreakdown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const restaurant = await active(supabase, userId);

    const { data: sales } = await supabase
      .from("sales")
      .select("platform, total")
      .eq("restaurant_id", restaurant.id);

    const breakdown: Record<string, number> = {};
    for (const sale of sales ?? []) {
      breakdown[sale.platform] = (breakdown[sale.platform] ?? 0) + (sale.total ?? 0);
    }

    return {
      data: Object.entries(breakdown).map(([platform, total]) => ({
        platform: platform.replace(/^./, (c) => c.toUpperCase()),
        total,
      })),
      isDemo: false,
    };
  });
