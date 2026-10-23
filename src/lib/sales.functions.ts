import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { SALES_CHANNELS } from "./sales";

type SaleRow = {
  id: string;
  platform: string;
  order_number: string | null;
  total: number;
  tax: number;
  tip: number;
  status: string;
  created_at: string;
  payout: number | null;
  fees: number | null;
  promotions: number | null;
  fee_breakdown: Record<string, number> | null;
};

const FEE_LABELS: [string, string][] = [
  ["marketplace", "Marketplace fee (commission)"],
  ["tax_on_marketplace", "Tax on marketplace fee"],
  ["delivery_network", "Delivery network fee"],
  ["order_processing", "Order processing fee"],
  ["offer_redemption", "Offer redemption fee"],
];

type DailyRow = {
  day: string;
  platform: string;
  orders: number;
  failed: number;
  gross: number;
  tax: number;
  tips: number;
  fees: number;
  promotions: number;
  payout: number;
  payout_orders: number;
};

/** Totals in the same shape as summarize(), from database-side daily rows (no row cap). */
function summarizeDaily(rows: DailyRow[]) {
  const t = {
    orders: 0,
    gross: 0,
    tax: 0,
    tips: 0,
    failed: 0,
    fees: 0,
    promotions: 0,
    payout: 0,
    payoutOrders: 0,
  };
  for (const r of rows) {
    t.orders += Number(r.orders);
    t.failed += Number(r.failed);
    t.gross += Number(r.gross);
    t.tax += Number(r.tax);
    t.tips += Number(r.tips);
    t.fees += Number(r.fees);
    t.promotions += Number(r.promotions);
    t.payout += Number(r.payout);
    t.payoutOrders += Number(r.payout_orders);
  }
  return { ...t, net: t.gross - t.tax - t.tips };
}

/** The restaurant's timezone and today's local date. */
async function restaurantClock(settings: unknown) {
  const { localNow, parseShiftSettings } = await import("./operating-day");
  const timezone = parseShiftSettings(settings).timezone;
  return { timezone, today: localNow(timezone).date };
}

function normalizeDays(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return [7, 30, 90].includes(n) ? n : 30;
}

const FAILED = ["refunded", "cancelled", "canceled", "voided", "void", "error", "failed"];

function summarize(rows: SaleRow[]) {
  let orders = 0;
  let gross = 0;
  let tax = 0;
  let tips = 0;
  let failed = 0;
  let fees = 0;
  let promotions = 0;
  let payout = 0;
  let payoutOrders = 0;
  for (const row of rows) {
    if (FAILED.includes(row.status.toLowerCase())) {
      failed += 1;
      continue;
    }
    orders += 1;
    gross += Number(row.total ?? 0);
    tax += Number(row.tax ?? 0);
    tips += Number(row.tip ?? 0);
    if (row.payout !== null && row.payout !== undefined) {
      payoutOrders += 1;
      payout += Number(row.payout);
      fees += Number(row.fees ?? 0);
      promotions += Number(row.promotions ?? 0);
    }
  }
  return {
    orders,
    gross,
    tax,
    tips,
    net: gross - tax - tips,
    failed,
    fees,
    promotions,
    payout,
    payoutOrders,
  };
}

export const getSalesOverview = createServerFn({ method: "GET" })
  .validator((data: { days?: number } | undefined) => ({ days: normalizeDays(data?.days) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager, canManage } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { addDays } = await import("./payroll");
    const { timezone, today } = await restaurantClock(restaurant.settings);
    const since = addDays(today, -(data.days - 1));

    const [salesRes, connectionsRes, cateringRes] = await Promise.all([
      context.supabase.rpc("sales_daily", {
        _restaurant_id: restaurant.id,
        _from: since,
        _to: today,
        _tz: timezone,
      }),
      context.supabase
        .from("platform_connections")
        .select("platform, status, last_synced_at")
        .eq("restaurant_id", restaurant.id),
      context.supabase
        .from("catering_orders")
        .select("id, total, status, event_date")
        .eq("restaurant_id", restaurant.id)
        .gte("event_date", since)
        .lte("event_date", today),
    ]);
    if (salesRes.error) throw salesRes.error;
    if (connectionsRes.error) throw connectionsRes.error;
    if (cateringRes.error) throw cateringRes.error;

    const rows = (salesRes.data ?? []) as DailyRow[];
    const connections = new Map((connectionsRes.data ?? []).map((c) => [c.platform, c] as const));

    const channels = SALES_CHANNELS.map((channel) => {
      const own = rows.filter((r) => r.platform === channel.platformKey);
      const connection = connections.get(channel.slug) ?? connections.get(channel.platformKey);
      return {
        slug: channel.slug,
        label: channel.label,
        kind: channel.kind,
        connected: connection?.status === "connected",
        lastSyncedAt: connection?.last_synced_at ?? null,
        ...summarizeDaily(own),
      };
    });

    const cateringOrders = (cateringRes.data ?? []).filter((o) => o.status !== "cancelled");
    const catering = {
      orders: cateringOrders.length,
      gross: cateringOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    };

    const totals = summarizeDaily(rows);
    return {
      days: data.days,
      from: since,
      to: today,
      canManage: canManage(restaurant.role),
      restaurantName: restaurant.name,
      totals: { ...totals, grossWithCatering: totals.gross + catering.gross },
      channels,
      catering,
    };
  });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ORDER_LIST_LIMIT = 500;

export const getChannelSales = createServerFn({ method: "GET" })
  .validator((data: { slug: string; from?: string; to?: string }) => {
    const from = typeof data.from === "string" && DATE_RE.test(data.from) ? data.from : null;
    const to = typeof data.to === "string" && DATE_RE.test(data.to) ? data.to : null;
    return { slug: String(data.slug), from, to };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const channel = SALES_CHANNELS.find((c) => c.slug === data.slug);
    if (!channel) throw new Error("Unknown sales channel");

    const { requireManager } = await import("./tenant.server");
    const { dayRangeUtc } = await import("./operating-day");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { timezone, today } = await restaurantClock(restaurant.settings);
    // Default to the restaurant's own "today", not the server's UTC date.
    const from = data.from ?? today;
    const to = data.to && data.to >= from ? data.to : from;
    const { start } = dayRangeUtc(from, timezone);
    const { end } = dayRangeUtc(to, timezone);

    const [dailyRes, salesRes, connectionRes] = await Promise.all([
      context.supabase.rpc("sales_daily", {
        _restaurant_id: restaurant.id,
        _from: from,
        _to: to,
        _tz: timezone,
      }),
      context.supabase
        .from("sales")
        .select(
          "id, platform, order_number, total, tax, tip, status, created_at, payout, fees, promotions, fee_breakdown",
        )
        .eq("restaurant_id", restaurant.id)
        .eq("platform", channel.platformKey)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false })
        .limit(ORDER_LIST_LIMIT),
      context.supabase
        .from("platform_connections")
        .select("id, platform, status, account_label, last_synced_at, last_error")
        .eq("restaurant_id", restaurant.id)
        .in("platform", [channel.slug, channel.platformKey])
        .maybeSingle(),
    ]);
    if (dailyRes.error) throw dailyRes.error;
    if (salesRes.error) throw salesRes.error;

    const daily = ((dailyRes.data ?? []) as DailyRow[]).filter(
      (r) => r.platform === channel.platformKey,
    );
    const rows = (salesRes.data ?? []) as SaleRow[];

    const feeTotals = new Map<string, number>();
    for (const row of rows) {
      if (!row.fee_breakdown) continue;
      for (const [key, value] of Object.entries(row.fee_breakdown)) {
        feeTotals.set(key, (feeTotals.get(key) ?? 0) + Number(value ?? 0));
      }
    }
    const feeBreakdown = FEE_LABELS.map(([key, label]) => ({
      key,
      label,
      amount: feeTotals.get(key) ?? 0,
    })).filter((f) => f.amount !== 0);

    const totals = summarizeDaily(daily);
    return {
      from,
      to,
      today,
      channel: { slug: channel.slug, label: channel.label, kind: channel.kind },
      connection: connectionRes.data ?? null,
      totals,
      feeBreakdown,
      // Fee breakdown and the order list come from the newest orders only.
      ordersShown: rows.length,
      ordersTruncated: rows.length < totals.orders + totals.failed,
      days_breakdown: daily
        .map((r) => ({ date: r.day, orders: Number(r.orders), gross: Number(r.gross) }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
      orders: rows.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        total: Number(row.total ?? 0),
        tax: Number(row.tax ?? 0),
        tip: Number(row.tip ?? 0),
        status: row.status,
        createdAt: row.created_at,
        payout: row.payout === null ? null : Number(row.payout),
        fees: row.fees === null ? null : Number(row.fees),
        promotions: row.promotions === null ? null : Number(row.promotions),
      })),
    };
  });

export const importPlatformReport = createServerFn({ method: "POST" })
  .validator((data: { slug: string; text: string }) => {
    if (typeof data?.text !== "string" || data.text.length > 5_000_000)
      throw new Error("File too large");
    return { slug: String(data.slug), text: data.text };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const channel = SALES_CHANNELS.find((c) => c.slug === data.slug);
    if (!channel) throw new Error("Unknown sales channel");
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { parseShiftSettings } = await import("./operating-day");
    const { importReport } = await import("./report-import.server");
    return importReport(context.supabase, {
      restaurantId: restaurant.id,
      platform: channel.platformKey,
      timezone: parseShiftSettings(restaurant.settings).timezone,
      text: data.text,
      userId: context.userId,
      userEmail: context.claims?.email ?? null,
    });
  });

export const getChannelInsights = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const channel = SALES_CHANNELS.find((c) => c.slug === data.slug);
    if (!channel) throw new Error("Unknown sales channel");
    const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const [payouts, issues, ratings] = await Promise.all([
      context.supabase
        .from("platform_payouts")
        .select(
          "id, reference_id, payout_date, order_count, sales, fees, promotions, refunds, other, total_payout",
        )
        .eq("restaurant_id", restaurant.id)
        .eq("platform", channel.platformKey)
        .order("payout_date", { ascending: false })
        .limit(26),
      context.supabase
        .from("day_issues")
        .select("id, business_date, category, amount, description")
        .eq("restaurant_id", restaurant.id)
        .eq("platform", channel.platformKey)
        .order("business_date", { ascending: false })
        .limit(50),
      context.supabase
        .from("platform_ratings")
        .select("id, order_id, item_name, rating_date, rating_value, tags, comment")
        .eq("restaurant_id", restaurant.id)
        .eq("platform", channel.platformKey)
        .order("rating_date", { ascending: false })
        .limit(200),
    ]);
    if (payouts.error) throw payouts.error;
    if (issues.error) throw issues.error;
    if (ratings.error) throw ratings.error;
    const orderRatings = (ratings.data ?? []).filter((r) => !r.item_name);
    const avg = orderRatings.length
      ? orderRatings.reduce((s, r) => s + Number(r.rating_value ?? 0), 0) / orderRatings.length
      : null;
    return {
      canManage: canManage(restaurant.role),
      payouts: payouts.data ?? [],
      issues: issues.data ?? [],
      ratings: ratings.data ?? [],
      averageRating: avg,
      ratingCount: orderRatings.length,
    };
  });

export const importToastSummary = createServerFn({ method: "POST" })
  .validator((data: { summary: import("./toast-summary").ToastSummary }) => {
    const s = data?.summary;
    if (!s || !DATE_RE.test(s.startDate) || !DATE_RE.test(s.endDate))
      throw new Error("Invalid report");
    if (JSON.stringify(s).length > 500_000) throw new Error("Report too large");
    return { summary: s };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const s = data.summary;
    const { error } = await context.supabase.from("pos_sales_summaries").upsert(
      {
        restaurant_id: restaurant.id,
        platform: "toast",
        start_date: s.startDate,
        end_date: s.endDate,
        data: s as never,
        created_by: context.userId,
      },
      { onConflict: "restaurant_id,platform,start_date,end_date" },
    );
    if (error) throw new Error(error.message);
    return { startDate: s.startDate, endDate: s.endDate };
  });

export const getToastSummaries = createServerFn({ method: "GET" })
  .validator((data: { from: string; to: string }) => {
    if (!DATE_RE.test(data.from) || !DATE_RE.test(data.to)) throw new Error("Invalid dates");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("pos_sales_summaries")
      .select("start_date, end_date, data")
      .eq("restaurant_id", restaurant.id)
      .eq("platform", "toast")
      .lte("start_date", data.to)
      .gte("end_date", data.from)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => r.data as unknown as import("./toast-summary").ToastSummary);
  });

export const listItemOutages = createServerFn({ method: "GET" })
  .validator((data: { platform: string; from: string; to: string }) => {
    if (!DATE_RE.test(data.from) || !DATE_RE.test(data.to)) throw new Error("Invalid dates");
    return { platform: String(data.platform).slice(0, 40), from: data.from, to: data.to };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("item_outages")
      .select("id, item_name, outage_date, note, reported_by_email, back_at, created_at")
      .eq("restaurant_id", restaurant.id)
      .eq("platform", data.platform)
      .gte("outage_date", data.from)
      .lte("outage_date", data.to)
      .order("outage_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addItemOutage = createServerFn({ method: "POST" })
  .validator((data: { platform: string; itemName: string; date: string; note?: string }) => {
    const itemName = String(data.itemName ?? "")
      .trim()
      .slice(0, 120);
    if (!itemName) throw new Error("Enter the item name");
    if (!DATE_RE.test(data.date)) throw new Error("Invalid date");
    return {
      platform: String(data.platform).slice(0, 40),
      itemName,
      date: data.date,
      note:
        String(data.note ?? "")
          .trim()
          .slice(0, 500) || null,
    };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { error } = await context.supabase.from("item_outages").insert({
      restaurant_id: restaurant.id,
      platform: data.platform,
      item_name: data.itemName,
      outage_date: data.date,
      note: data.note,
      reported_by: context.userId,
      reported_by_email: (context.claims?.email as string | undefined) ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateItemOutage = createServerFn({ method: "POST" })
  .validator((data: { id: string; action: "back" | "delete" }) => ({
    id: String(data.id),
    action: data.action === "delete" ? ("delete" as const) : ("back" as const),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const q = context.supabase.from("item_outages");
    const { error } =
      data.action === "delete"
        ? await q.delete().eq("id", data.id)
        : await q.update({ back_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TOAST_KINDS = { pmix: "toast_pmix", removed: "toast_removed" } as const;

export const importToastReport = createServerFn({ method: "POST" })
  .validator(
    (data: { kind: "pmix" | "removed"; report: { startDate: string; endDate: string } }) => {
      if (!(data?.kind in TOAST_KINDS)) throw new Error("Unknown report");
      const r = data.report;
      if (!r || !DATE_RE.test(r.startDate) || !DATE_RE.test(r.endDate))
        throw new Error("Invalid report");
      if (JSON.stringify(r).length > 500_000) throw new Error("Report too large");
      return data;
    },
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("pos_sales_summaries").upsert(
      {
        restaurant_id: restaurant.id,
        platform: TOAST_KINDS[data.kind],
        start_date: data.report.startDate,
        end_date: data.report.endDate,
        data: data.report as never,
        created_by: context.userId,
      },
      { onConflict: "restaurant_id,platform,start_date,end_date" },
    );
    if (error) throw new Error(error.message);
    return { startDate: data.report.startDate, endDate: data.report.endDate };
  });

export const getToastReports = createServerFn({ method: "GET" })
  .validator((data: { from: string; to: string }) => {
    if (!DATE_RE.test(data.from) || !DATE_RE.test(data.to)) throw new Error("Invalid dates");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("pos_sales_summaries")
      .select("platform, start_date, end_date, data")
      .eq("restaurant_id", restaurant.id)
      .in("platform", Object.values(TOAST_KINDS))
      .lte("start_date", data.to)
      .gte("end_date", data.from)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    const all = rows ?? [];
    return {
      pmix: all
        .filter((r) => r.platform === "toast_pmix")
        .map((r) => r.data as unknown as import("./toast-summary").ToastProductMix),
      removed: all
        .filter((r) => r.platform === "toast_removed")
        .map((r) => r.data as unknown as import("./toast-summary").ToastRemovedItems),
    };
  });
