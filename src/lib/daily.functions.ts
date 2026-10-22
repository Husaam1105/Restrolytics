import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { dayRangeUtc, localNow, parseShiftSettings } from "./operating-day";
import { minutesToHours } from "./payroll";

export const ISSUE_CATEGORIES = [
  { id: "void", label: "Voided order" },
  { id: "refund", label: "Refund" },
  { id: "comp", label: "Comped / remade" },
  { id: "waste", label: "Waste / spoilage" },
  { id: "complaint", label: "Customer complaint" },
  { id: "shortage", label: "Cash shortage" },
  { id: "other", label: "Other" },
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]["id"];

export const PLATFORM_LABELS: Record<string, string> = {
  pos: "Toast POS",
  ubereats: "Uber Eats",
  doordash: "DoorDash",
  grubhub: "Grubhub",
  manual: "Manual / walk-in",
};

const PLATFORM_ORDER = ["pos", "ubereats", "doordash", "grubhub", "manual"];

const FAILED_STATUSES = ["refunded", "cancelled", "canceled", "voided", "void", "error", "failed"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDate(value: unknown, fallback: string) {
  return typeof value === "string" && ISO_DATE.test(value) ? value : fallback;
}

export const getDayReport = createServerFn({ method: "GET" })
  .inputValidator((data: { date?: string; from?: string; to?: string } | undefined) => ({
    date: data?.date ?? null,
    from: data?.from ?? null,
    to: data?.to ?? null,
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(supabase, userId);

    const shift = parseShiftSettings(restaurant.settings);
    const today = localNow(shift.timezone).date;
    const date = normalizeDate(data.date, today);
    // A from/to range wins; otherwise fall back to the single business day.
    let from = date;
    let to = date;
    if (ISO_DATE.test(String(data.from)) && ISO_DATE.test(String(data.to))) {
      from = data.from! <= data.to! ? data.from! : data.to!;
      to = data.from! <= data.to! ? data.to! : data.from!;
    } else if (ISO_DATE.test(String(data.from))) {
      from = data.from!;
      to = from;
    }
    const { start } = dayRangeUtc(from, shift.timezone);
    const { end } = dayRangeUtc(to, shift.timezone);
    const manager = canManage(restaurant.role);

    const [salesRes, issuesRes, entriesRes, poolsRes] = await Promise.all([
      supabase
        .from("sales")
        .select("id, platform, order_number, total, tax, tip, status, created_at")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false }),
      supabase
        .from("day_issues")
        .select("id, category, amount, description, platform, created_by_email, created_at")
        .eq("restaurant_id", restaurant.id)
        .gte("business_date", from)
        .lte("business_date", to)
        .order("created_at", { ascending: false }),
      supabase
        .from("time_entries")
        .select("id, employee_id, minutes, clock_in, clock_out, source")
        .eq("restaurant_id", restaurant.id)
        .gte("work_date", from)
        .lte("work_date", to),
      supabase
        .from("tip_pools")
        .select("area, amount")
        .eq("restaurant_id", restaurant.id)
        .gte("pool_date", from)
        .lte("pool_date", to),
    ]);

    const sales = salesRes.data ?? [];
    const goodSales = sales.filter((s) => !FAILED_STATUSES.includes(String(s.status).toLowerCase()));
    const failedSales = sales.filter((s) => FAILED_STATUSES.includes(String(s.status).toLowerCase()));

    const byPlatform = new Map<
      string,
      { platform: string; label: string; orders: number; gross: number; tax: number; tips: number; net: number }
    >();
    for (const sale of goodSales) {
      const key = String(sale.platform);
      const row =
        byPlatform.get(key) ??
        {
          platform: key,
          label: PLATFORM_LABELS[key] ?? key,
          orders: 0,
          gross: 0,
          tax: 0,
          tips: 0,
          net: 0,
        };
      row.orders += 1;
      row.gross += Number(sale.total ?? 0);
      row.tax += Number(sale.tax ?? 0);
      row.tips += Number(sale.tip ?? 0);
      row.net = row.gross - row.tax - row.tips;
      byPlatform.set(key, row);
    }
    const platforms = [...byPlatform.values()].sort(
      (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform),
    );

    const gross = platforms.reduce((sum, p) => sum + p.gross, 0);
    const tax = platforms.reduce((sum, p) => sum + p.tax, 0);
    const tips = platforms.reduce((sum, p) => sum + p.tips, 0);

    // Who worked, and what the labour cost was.
    const employeeIds = [...new Set((entriesRes.data ?? []).map((e) => e.employee_id))];
    const { data: employeeRows } = employeeIds.length
      ? await supabase
          .from("employees")
          .select("id, full_name, area, position, hourly_rate, pay_method, tip_eligible")
          .in("id", employeeIds)
      : { data: [] as never[] };

    const employees = new Map((employeeRows ?? []).map((e) => [e.id, e]));

    const workedMap = new Map<
      string,
      {
        employeeId: string;
        name: string;
        area: string;
        position: string | null;
        minutes: number;
        hours: number;
        rate: number;
        wages: number;
        payMethod: string;
        tipEligible: boolean;
        openShift: boolean;
        firstIn: string | null;
        lastOut: string | null;
      }
    >();

    for (const entry of entriesRes.data ?? []) {
      const employee = employees.get(entry.employee_id);
      if (!employee) continue;
      const current =
        workedMap.get(entry.employee_id) ??
        {
          employeeId: entry.employee_id,
          name: employee.full_name,
          area: employee.area,
          position: employee.position ?? null,
          minutes: 0,
          hours: 0,
          rate: Number(employee.hourly_rate ?? 0),
          wages: 0,
          payMethod: employee.pay_method,
          tipEligible: Boolean(employee.tip_eligible),
          openShift: false,
          firstIn: null as string | null,
          lastOut: null as string | null,
        };
      current.minutes += Number(entry.minutes ?? 0);
      if (entry.clock_in && (!current.firstIn || entry.clock_in < current.firstIn)) {
        current.firstIn = entry.clock_in;
      }
      if (entry.clock_out && (!current.lastOut || entry.clock_out > current.lastOut)) {
        current.lastOut = entry.clock_out;
      }
      if (entry.clock_in && !entry.clock_out) current.openShift = true;
      current.hours = minutesToHours(current.minutes);
      current.wages = Math.round(current.hours * current.rate * 100) / 100;
      workedMap.set(entry.employee_id, current);
    }

    const worked = [...workedMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    const labourHours = Math.round(worked.reduce((s, w) => s + w.hours, 0) * 100) / 100;
    const labourCost = Math.round(worked.reduce((s, w) => s + w.wages, 0) * 100) / 100;
    const tipPool = (poolsRes.data ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);

    const issues = (issuesRes.data ?? []).map((i) => ({
      id: i.id,
      category: i.category as IssueCategory,
      amount: Number(i.amount ?? 0),
      description: i.description,
      platform: i.platform,
      by: i.created_by_email,
      at: i.created_at,
    }));

    const failedTotal = failedSales.reduce((s, x) => s + Number(x.total ?? 0), 0);
    const issuesTotal = issues.reduce((s, i) => s + i.amount, 0);

    return {
      date: to,
      from,
      to,
      today,
      timezone: shift.timezone,
      restaurantName: restaurant.name,
      role: restaurant.role,
      canManage: manager,
      totals: {
        gross,
        tax,
        tips,
        netSales: Math.round((gross - tax - tips) * 100) / 100,
        orders: goodSales.length,
        averageTicket: goodSales.length ? Math.round((gross / goodSales.length) * 100) / 100 : 0,
        labourHours,
        labourCost,
        tipPool,
        labourPercent: gross > 0 ? Math.round((labourCost / gross) * 1000) / 10 : 0,
        lossTotal: Math.round((failedTotal + issuesTotal) * 100) / 100,
        lossCount: failedSales.length + issues.length,
      },
      platforms,
      issues,
      failedSales: failedSales.map((s) => ({
        id: s.id,
        platform: String(s.platform),
        label: PLATFORM_LABELS[String(s.platform)] ?? String(s.platform),
        orderNumber: s.order_number,
        total: Number(s.total ?? 0),
        status: String(s.status),
        at: s.created_at,
      })),
      worked,
    };
  });

export const logDayIssue = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      date: string;
      category: IssueCategory;
      amount: number;
      description: string;
      platform?: string | null;
    }) => data,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId, claims } = context;
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(supabase, userId);
    const shift = parseShiftSettings(restaurant.settings);

    const description = data.description.trim();
    if (!description) throw new Error("Add a short note about what happened.");

    const { error } = await supabase.from("day_issues").insert({
      restaurant_id: restaurant.id,
      business_date: normalizeDate(data.date, localNow(shift.timezone).date),
      category: data.category,
      amount: Number.isFinite(data.amount) ? Math.max(0, data.amount) : 0,
      description,
      platform: data.platform ?? null,
      created_by: userId,
      created_by_email: (claims as { email?: string } | null)?.email ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteDayIssue = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("day_issues")
      .delete()
      .eq("id", data.id)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });
