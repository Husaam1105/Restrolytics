import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActiveRestaurant } from "./tenant.server";

export type CopilotAlert = {
  level: "warning" | "info";
  title: string;
  detail: string;
  ask: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const r2 = (n: number) => Math.round(n * 100) / 100;

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function localDate(timezone: string, d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Builds a compact, role-scoped data snapshot for the copilot plus deterministic alerts. */
export async function buildCopilotContext(
  supabase: SupabaseClient,
  userId: string,
  restaurant: ActiveRestaurant,
  options: { alertsOnly?: boolean } = {},
) {
  const { parseShiftSettings } = await import("./operating-day");
  const tz = parseShiftSettings(restaurant.settings).timezone;
  const today = localDate(tz);
  const d14 = addDays(today, -14);
  const d30 = addDays(today, -30);
  const d60 = addDays(today, -60);
  const next7 = addDays(today, 7);
  const isManager = restaurant.role !== "staff";
  const rid = restaurant.id;

  const { data: me } = await supabase
    .from("employees")
    .select("id, full_name, area, position, hourly_rate")
    .eq("restaurant_id", rid)
    .eq("user_id", userId)
    .maybeSingle();

  const data: Any = {
    restaurant: restaurant.name,
    today,
    timezone: tz,
    yourRole: restaurant.role,
    you: me ? { name: me.full_name, area: me.area, position: me.position } : null,
  };
  const alerts: CopilotAlert[] = [];

  // Staff only ever see their own records. A staff login that isn't linked to
  // an employee yet has no personal data, never the whole team's.
  if (!isManager && !me) {
    data.note =
      "This login isn't linked to an employee record yet, so there are no hours, pay or schedule to show. Ask a manager to link it on the Employees page.";
    return { data, alerts };
  }
  const own = !isManager && me ? me : null;

  if (!options.alertsOnly) {
    // Tasks for today (everyone; staff limited to own area)
    const tasksQ = supabase
      .from("shift_tasks")
      .select("id, area, shift, title")
      .eq("restaurant_id", rid)
      .eq("active", true);
    const [{ data: tasks }, { data: done }] = await Promise.all([
      own && own.area !== "both" ? tasksQ.eq("area", own.area) : tasksQ,
      supabase
        .from("shift_task_completions")
        .select("task_id, completed_by_email, value")
        .eq("restaurant_id", rid)
        .eq("task_date", today),
    ]);
    const doneMap = new Map((done ?? []).map((c: Any) => [c.task_id, c]));
    data.todaysTasks = (tasks ?? []).map((t: Any) => ({
      area: t.area,
      shift: t.shift,
      task: t.title,
      done: doneMap.has(t.id)
        ? `by ${String(doneMap.get(t.id)!.completed_by_email ?? "").split("@")[0]}${doneMap.get(t.id)!.value ? ` (${doneMap.get(t.id)!.value})` : ""}`
        : "open",
    }));

    // Schedule next 7 days
    const schedQ = supabase
      .from("staff_schedules")
      .select("shift_date, area, shift, start_time, end_time, employees(full_name)")
      .eq("restaurant_id", rid)
      .gte("shift_date", addDays(today, -7))
      .lte("shift_date", next7)
      .order("shift_date");
    const { data: sched } = await (own ? schedQ.eq("employee_id", own.id) : schedQ);
    data.schedule = (sched ?? []).map((s: Any) => ({
      date: s.shift_date,
      who: s.employees?.full_name,
      area: s.area,
      shift: s.shift,
      time: [s.start_time, s.end_time].filter(Boolean).join("-"),
    }));
  }

  // Hours (last 14 days)
  const teQ = supabase
    .from("time_entries")
    .select("work_date, minutes, employee_id, employees(full_name, hourly_rate, area)")
    .eq("restaurant_id", rid)
    .gte("work_date", d14);
  const { data: te } = await (own ? teQ.eq("employee_id", own.id) : teQ);
  const hoursByPerson: Record<string, { hours: number; estWages: number; area: string }> = {};
  const laborByDay: Record<string, number> = {};
  for (const t of (te ?? []) as Any[]) {
    const name = t.employees?.full_name ?? "Unknown";
    const h = (t.minutes ?? 0) / 60;
    const w = h * Number(t.employees?.hourly_rate ?? 0);
    hoursByPerson[name] ??= { hours: 0, estWages: 0, area: t.employees?.area ?? "" };
    hoursByPerson[name].hours = r2(hoursByPerson[name].hours + h);
    hoursByPerson[name].estWages = r2(hoursByPerson[name].estWages + w);
    laborByDay[t.work_date] = r2((laborByDay[t.work_date] ?? 0) + w);
  }
  data.hoursLast14Days = hoursByPerson;

  // Payroll
  if (!options.alertsOnly) {
    const { data: periods } = await supabase
      .from("payroll_periods")
      .select("id, start_date, end_date, status")
      .eq("restaurant_id", rid)
      .order("start_date", { ascending: false })
      .limit(isManager ? 3 : 6);
    const periodIds = (periods ?? []).map((p: Any) => p.id);
    if (periodIds.length) {
      const plQ = supabase
        .from("payroll_lines")
        .select("period_id, hours, wages, tips, total, pay_method, paid, employees(full_name)")
        .in("period_id", periodIds);
      const { data: lines } = await (own ? plQ.eq("employee_id", own.id) : plQ);
      data.payroll = (periods ?? []).map((p: Any) => ({
        week: `${p.start_date} to ${p.end_date}`,
        status: p.status,
        lines: (lines ?? [])
          .filter((l: Any) => l.period_id === p.id)
          .map((l: Any) => ({
            who: l.employees?.full_name,
            hours: Number(l.hours),
            wages: Number(l.wages),
            tips: Number(l.tips),
            total: Number(l.total),
            method: l.pay_method,
            paid: l.paid,
          })),
      }));
    }
  }

  if (!isManager) {
    data.note =
      "Staff account: sales, costs, inventory values and other employees' pay are not available.";
    return { data, alerts };
  }

  const [
    salesRes,
    toastRes,
    issuesRes,
    outagesRes,
    invRes,
    ratingsRes,
    payoutsRes,
    empRes,
    cateringRes,
  ] = await Promise.all([
    supabase.rpc("sales_daily", { _restaurant_id: rid, _from: d30, _to: today, _tz: tz }),
    supabase
      .from("pos_sales_summaries")
      .select("data")
      .eq("restaurant_id", rid)
      .gte("end_date", d60)
      .order("start_date", { ascending: false })
      .limit(8),
    supabase
      .from("day_issues")
      .select("business_date, category, amount, description, platform")
      .eq("restaurant_id", rid)
      .gte("business_date", d14)
      .order("business_date", { ascending: false })
      .limit(100),
    supabase
      .from("item_outages")
      .select("item_name, outage_date, note, reported_by_email, back_at, platform")
      .eq("restaurant_id", rid)
      .gte("outage_date", d30)
      .order("outage_date", { ascending: false })
      .limit(100),
    supabase
      .from("inventory_items")
      .select(
        "name, unit, current_stock, reorder_level, par_level, cost_per_unit, last_ordered_at, vendors(name)",
      )
      .eq("restaurant_id", rid)
      .limit(1000),
    supabase
      .from("platform_ratings")
      .select("platform, item_name, rating_date, rating_value, comment, tags")
      .eq("restaurant_id", rid)
      .gte("rating_date", d30)
      .limit(300),
    supabase
      .from("platform_payouts")
      .select("platform, payout_date, order_count, sales, fees, promotions, total_payout")
      .eq("restaurant_id", rid)
      .gte("payout_date", d60)
      .order("payout_date", { ascending: false })
      .limit(30),
    supabase
      .from("employees")
      .select("full_name, area, position, hourly_rate, pay_method, active")
      .eq("restaurant_id", rid),
    supabase
      .from("catering_orders")
      .select("customer_name, event_date, headcount, total, status")
      .eq("restaurant_id", rid)
      .gte("event_date", d30)
      .order("event_date")
      .limit(50),
  ]);

  // Delivery / imported sales aggregated by local day and platform
  const byDay: Record<
    string,
    Record<string, { orders: number; sales: number; payout: number; fees: number }>
  > = {};
  for (const s of (salesRes.data ?? []) as Any[]) {
    byDay[s.day] ??= {};
    byDay[s.day]![s.platform] = {
      orders: Number(s.orders),
      sales: r2(Number(s.gross)),
      payout: r2(Number(s.payout)),
      fees: r2(Number(s.fees)),
    };
  }
  data.platformSalesByDay = byDay;
  data.platformPayouts = payoutsRes.data ?? [];
  data.toastPosSummaries = (toastRes.data ?? []).map((t: Any) => t.data);
  data.errorsAndIssues = issuesRes.data ?? [];
  data.itemsNotAvailable = (outagesRes.data ?? []).map((o: Any) => ({
    ...o,
    reported_by: String(o.reported_by_email ?? "").split("@")[0],
    reported_by_email: undefined,
    status: o.back_at ? "back" : "still out",
  }));
  const inv = (invRes.data ?? []) as Any[];
  const low = inv.filter(
    (i) => Number(i.current_stock) <= Number(i.reorder_level) && Number(i.reorder_level) > 0,
  );
  data.inventory = {
    itemsTracked: inv.length,
    stockValue: r2(inv.reduce((a, i) => a + Number(i.current_stock) * Number(i.cost_per_unit), 0)),
    lowStock: low.slice(0, 60).map((i) => ({
      item: i.name,
      onHand: Number(i.current_stock),
      reorderAt: Number(i.reorder_level),
      par: Number(i.par_level),
      unit: i.unit,
      vendor: i.vendors?.name,
      lastOrdered: i.last_ordered_at?.slice(0, 10),
    })),
  };
  const ratings = (ratingsRes.data ?? []) as Any[];
  data.ratings = {
    count: ratings.length,
    average: ratings.length
      ? r2(ratings.reduce((a, r) => a + Number(r.rating_value ?? 0), 0) / ratings.length)
      : null,
    low: ratings.filter((r) => Number(r.rating_value) <= 3).slice(0, 25),
  };
  data.employees = empRes.data ?? [];
  data.estimatedLaborByDay = laborByDay;
  data.catering = cateringRes.data ?? [];

  // ---- Alerts ----
  if (low.length) {
    alerts.push({
      level: "warning",
      title: `${low.length} item${low.length > 1 ? "s" : ""} at or below reorder level`,
      detail:
        low
          .slice(0, 4)
          .map((i) => i.name)
          .join(", ") + (low.length > 4 ? "…" : ""),
      ask: "Which items are low on stock, and what should I order from each vendor?",
    });
  }
  const stillOut = (outagesRes.data ?? []).filter((o: Any) => !o.back_at);
  if (stillOut.length) {
    alerts.push({
      level: "warning",
      title: `${stillOut.length} item${stillOut.length > 1 ? "s" : ""} still marked not available`,
      detail: stillOut
        .slice(0, 4)
        .map((o: Any) => o.item_name)
        .join(", "),
      ask: "Which items are 86'd right now, since when, and what should we do about them?",
    });
  }
  const lowRatings = ratings.filter((r) => Number(r.rating_value) <= 2);
  if (lowRatings.length) {
    alerts.push({
      level: "warning",
      title: `${lowRatings.length} low rating${lowRatings.length > 1 ? "s" : ""} in the last 30 days`,
      detail: [...new Set(lowRatings.map((r) => r.item_name))].slice(0, 4).join(", "),
      ask: "Summarize our low ratings in the last 30 days and suggest fixes.",
    });
  }
  const recentIssues = (issuesRes.data ?? []).filter(
    (i: Any) => i.business_date >= addDays(today, -7),
  );
  if (recentIssues.length) {
    const total = recentIssues.reduce((a: number, i: Any) => a + Number(i.amount ?? 0), 0);
    alerts.push({
      level: "info",
      title: `${recentIssues.length} errors or refunds this past week`,
      detail: `About $${total.toFixed(2)} lost`,
      ask: "What errors, refunds and issues did we have this past week and how do we prevent them?",
    });
  }
  const latestToast = data.toastPosSummaries[0];
  if (latestToast) {
    const labor = Object.entries(laborByDay)
      .filter(([d]) => d >= latestToast.startDate && d <= latestToast.endDate)
      .reduce((a, [, v]) => a + v, 0);
    if (labor > 0 && latestToast.netSales > 0) {
      const pct = (labor / latestToast.netSales) * 100;
      alerts.push({
        level: pct > 30 ? "warning" : "info",
        title: `Labor is about ${pct.toFixed(0)}% of POS net sales`,
        detail: `${latestToast.startDate} to ${latestToast.endDate}`,
        ask: "How is our labor cost versus sales, and where can we adjust scheduling?",
      });
    }
  }
  return { data, alerts };
}
