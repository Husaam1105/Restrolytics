import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  addDays,
  hoursToMinutes,
  minutesToHours,
  parsePayrollSettings,
  weekDays,
  weekStartDate,
  type PayArea,
  type PayMethod,
  type PoolArea,
} from "./payroll";
import { localNow, parseShiftSettings } from "./operating-day";

type EmployeeInput = {
  id?: string | null;
  fullName: string;
  area: PayArea;
  position?: string | null;
  hourlyRate: number;
  payMethod: PayMethod;
  tipEligible: boolean;
  active: boolean;
  phone?: string | null;
  notes?: string | null;
  loginEmail?: string | null;
};

type PayrollLineRow = {
  id: string;
  period_id: string;
  employee_id: string;
  hours: number;
  hourly_rate: number;
  wages: number;
  tips: number;
  adjustments: number;
  total: number;
  pay_method: string;
  paid: boolean;
  paid_at: string | null;
  acknowledged_at: string | null;
  note: string | null;
};

/** Today's date in the restaurant's own timezone. */
function today(settings: unknown) {
  return localNow(parseShiftSettings(settings).timezone).date;
}

export const getEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);

    const { data: employees, error } = await context.supabase
      .from("employees")
      .select(
        "id, user_id, full_name, area, position, hourly_rate, pay_method, tip_eligible, active, phone, notes",
      )
      .eq("restaurant_id", restaurant.id)
      .order("full_name");
    if (error) throw error;

    const { data: members } = canManage(restaurant.role)
      ? await context.supabase
          .from("restaurant_members")
          .select("user_id, email")
          .eq("restaurant_id", restaurant.id)
      : { data: [] };

    return {
      role: restaurant.role,
      restaurantName: restaurant.name,
      canManage: canManage(restaurant.role),
      employees: (employees ?? []).map((e) => ({
        id: e.id,
        userId: e.user_id,
        fullName: e.full_name,
        area: e.area as PayArea,
        position: e.position,
        hourlyRate: Number(e.hourly_rate ?? 0),
        payMethod: e.pay_method as PayMethod,
        tipEligible: e.tip_eligible,
        active: e.active,
        phone: e.phone,
        notes: e.notes,
      })),
      logins: (members ?? []).map((m) => ({ userId: m.user_id, email: m.email })),
    };
  });

export const saveEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EmployeeInput) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const fullName = data.fullName.trim();
    if (!fullName) throw new Error("Employee name is required.");

    let userId: string | null = null;
    const loginEmail = data.loginEmail?.trim().toLowerCase();
    if (loginEmail) {
      const { data: member } = await context.supabase
        .from("restaurant_members")
        .select("user_id")
        .eq("restaurant_id", restaurant.id)
        .eq("email", loginEmail)
        .maybeSingle();
      if (!member) {
        throw new Error(
          `${loginEmail} isn't on your team yet. Invite them on the Team page first, then link them here.`,
        );
      }
      userId = member.user_id;
    }

    const row = {
      restaurant_id: restaurant.id,
      user_id: userId,
      full_name: fullName,
      area: data.area,
      position: data.position?.trim() || null,
      hourly_rate: Number.isFinite(data.hourlyRate) ? Math.max(0, data.hourlyRate) : 0,
      pay_method: data.payMethod,
      tip_eligible: data.tipEligible,
      active: data.active,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("employees")
        .update(row)
        .eq("id", data.id)
        .eq("restaurant_id", restaurant.id);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("employees")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

/** Everything the manager payroll screen needs for one week or a combined date range. */
export const getPayrollWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { weekStart?: string | null; rangeStart?: string | null; rangeEnd?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { weekStartsOn } = parsePayrollSettings(restaurant.settings);
    const shift = parseShiftSettings(restaurant.settings);

    const rangeStart = data.rangeStart ?? null;
    const rangeEnd = data.rangeEnd ?? null;
    const isCombined = Boolean(rangeStart && rangeEnd);
    const weekStart = rangeStart && rangeEnd
      ? rangeStart
      : data.weekStart
        ? weekStartDate(data.weekStart, weekStartsOn)
        : weekStartDate(today(restaurant.settings), weekStartsOn);
    const weekEnd = rangeStart && rangeEnd ? rangeEnd : weekDays(weekStart)[6]!;
    if (weekEnd < weekStart) throw new Error("The end date must be after the start date.");
    const days: string[] = [];
    for (let day = weekStart; day <= weekEnd; day = addDays(day, 1)) {
      days.push(day);
      if (days.length > 366) throw new Error("Choose a date range of one year or less.");
    }

    const { data: employees } = await context.supabase
      .from("employees")
      .select("id, full_name, area, hourly_rate, pay_method, tip_eligible, active, position")
      .eq("restaurant_id", restaurant.id)
      .order("full_name");

    const { data: entries } = await context.supabase
      .from("time_entries")
      .select("id, employee_id, work_date, clock_in, clock_out, minutes, source, note")
      .eq("restaurant_id", restaurant.id)
      .gte("work_date", weekStart)
      .lte("work_date", weekEnd);

    const { data: pools } = await context.supabase
      .from("tip_pools")
      .select("id, pool_date, area, amount, note")
      .eq("restaurant_id", restaurant.id)
      .gte("pool_date", weekStart)
      .lte("pool_date", weekEnd);

    const { data: periods } = await context.supabase
      .from("payroll_periods")
      .select("id, start_date, end_date, status, paid_at, note")
      .eq("restaurant_id", restaurant.id)
      .lte("start_date", weekEnd)
      .gte("end_date", weekStart)
      .order("start_date");

    const period = !isCombined && periods?.length === 1 ? periods[0] : null;
    const periodIds = (periods ?? []).map((item) => item.id);
    const { data: rawLines } = periodIds.length
      ? await context.supabase
          .from("payroll_lines")
          .select(
            "id, period_id, employee_id, hours, hourly_rate, wages, tips, adjustments, total, pay_method, paid, paid_at, acknowledged_at, note",
          )
          .in("period_id", periodIds)
      : { data: [] };

    const lines = isCombined
      ? Object.values(
          ((rawLines ?? []) as PayrollLineRow[]).reduce<Record<string, PayrollLineRow>>((result, line) => {
            const current = result[line.employee_id];
            if (!current) {
              result[line.employee_id] = { ...line };
            } else {
              current.hours = Number(current.hours) + Number(line.hours);
              current.wages = Number(current.wages) + Number(line.wages);
              current.tips = Number(current.tips) + Number(line.tips);
              current.adjustments = Number(current.adjustments) + Number(line.adjustments);
              current.total = Number(current.total) + Number(line.total);
              current.paid = current.paid && line.paid;
              current.acknowledged_at = current.acknowledged_at && line.acknowledged_at;
            }
            return result;
          }, {}),
        )
      : rawLines ?? [];

    const minutesByEmployeeDay: Record<string, number> = {};
    for (const entry of entries ?? []) {
      const key = `${entry.employee_id}|${entry.work_date}`;
      minutesByEmployeeDay[key] = (minutesByEmployeeDay[key] ?? 0) + (entry.minutes ?? 0);
    }

    const staff = (employees ?? []).map((e) => ({
      id: e.id,
      fullName: e.full_name,
      area: e.area as PayArea,
      position: e.position,
      hourlyRate: Number(e.hourly_rate ?? 0),
      payMethod: e.pay_method as PayMethod,
      tipEligible: e.tip_eligible,
      active: e.active,
      minutesByDay: days.map((d) => minutesByEmployeeDay[`${e.id}|${d}`] ?? 0),
    }));

    const tipShares = computeTipShares(
      staff.map((s) => ({
        id: s.id,
        area: s.area,
        tipEligible: s.tipEligible,
        minutesByDay: s.minutesByDay,
      })),
      days,
      (pools ?? []).map((p) => ({
        poolDate: p.pool_date,
        area: p.area as PoolArea,
        amount: Number(p.amount ?? 0),
      })),
    );

    return {
      restaurantName: restaurant.name,
      role: restaurant.role,
      timezone: shift.timezone,
      weekStartsOn,
      weekStart,
      weekEnd,
      isCombined,
      periodCount: periods?.length ?? 0,
      days,
      employees: staff.map((s) => ({
        ...s,
        hours: minutesToHours(s.minutesByDay.reduce((a, b) => a + b, 0)),
        tipShare: Math.round((tipShares[s.id] ?? 0) * 100) / 100,
      })),
      openShifts: (entries ?? [])
        .filter((e) => e.clock_in && !e.clock_out)
        .map((e) => ({ employeeId: e.employee_id, clockIn: e.clock_in })),
      pools: (pools ?? []).map((p) => ({
        id: p.id,
        poolDate: p.pool_date,
        area: p.area as PoolArea,
        amount: Number(p.amount ?? 0),
        note: p.note,
      })),
      period: period
        ? { id: period.id, status: period.status, paidAt: period.paid_at, note: period.note }
        : null,
      lines: (lines ?? []).map((l) => ({
        id: l.id,
        employeeId: l.employee_id,
        hours: Number(l.hours ?? 0),
        hourlyRate: Number(l.hourly_rate ?? 0),
        wages: Number(l.wages ?? 0),
        tips: Number(l.tips ?? 0),
        adjustments: Number(l.adjustments ?? 0),
        total: Number(l.total ?? 0),
        payMethod: l.pay_method as PayMethod,
        paid: l.paid,
        paidAt: l.paid_at,
        acknowledgedAt: l.acknowledged_at,
        note: l.note,
      })),
    };
  });

/** Tips are shared out by hours worked on the day the tips were earned. */
function computeTipShares(
  staff: { id: string; area: PayArea; tipEligible: boolean; minutesByDay: number[] }[],
  days: string[],
  pools: { poolDate: string; area: PoolArea; amount: number }[],
) {
  const shares: Record<string, number> = {};
  for (const pool of pools) {
    const dayIndex = days.indexOf(pool.poolDate);
    if (dayIndex < 0 || pool.amount <= 0) continue;

    const eligible = staff.filter(
      (s) =>
        s.tipEligible &&
        (s.minutesByDay[dayIndex] ?? 0) > 0 &&
        (pool.area === "all" || s.area === "both" || s.area === pool.area),
    );
    const totalMinutes = eligible.reduce((sum, s) => sum + (s.minutesByDay[dayIndex] ?? 0), 0);
    if (totalMinutes === 0) continue;

    for (const person of eligible) {
      const portion = ((person.minutesByDay[dayIndex] ?? 0) / totalMinutes) * pool.amount;
      shares[person.id] = (shares[person.id] ?? 0) + portion;
    }
  }
  return shares;
}

/** Manager typing in hours for one person on one day (replaces what was there). */
export const saveHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { employeeId: string; workDate: string; hours: number }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    await context.supabase
      .from("time_entries")
      .delete()
      .eq("restaurant_id", restaurant.id)
      .eq("employee_id", data.employeeId)
      .eq("work_date", data.workDate);

    const minutes = hoursToMinutes(Number(data.hours) || 0);
    if (minutes > 0) {
      const { error } = await context.supabase.from("time_entries").insert({
        restaurant_id: restaurant.id,
        employee_id: data.employeeId,
        work_date: data.workDate,
        minutes,
        source: "manual",
        entered_by: context.userId,
      });
      if (error) throw error;
    }
    return { ok: true };
  });

export const saveTipPool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { poolDate: string; area: PoolArea; amount: number }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const amount = Math.max(0, Number(data.amount) || 0);
    if (amount === 0) {
      await context.supabase
        .from("tip_pools")
        .delete()
        .eq("restaurant_id", restaurant.id)
        .eq("pool_date", data.poolDate)
        .eq("area", data.area);
      return { ok: true };
    }

    const { error } = await context.supabase.from("tip_pools").upsert(
      { restaurant_id: restaurant.id, pool_date: data.poolDate, area: data.area, amount },
      { onConflict: "restaurant_id,pool_date,area" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const savePayrollSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { weekStartsOn: number }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const current = (restaurant.settings ?? {}) as Record<string, unknown>;

    const { error } = await context.supabase
      .from("restaurants")
      .update({
        settings: { ...current, payroll: { weekStartsOn: Number(data.weekStartsOn) || 0 } },
      })
      .eq("id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });

/** Builds (or rebuilds) the pay sheet for a week from the recorded hours and tips. */
export const buildPayrollWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { weekStart: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { weekStartsOn } = parsePayrollSettings(restaurant.settings);
    const weekStart = weekStartDate(data.weekStart, weekStartsOn);
    const days = weekDays(weekStart);
    const weekEnd = days[6]!;

    const { data: employees } = await context.supabase
      .from("employees")
      .select("id, area, hourly_rate, pay_method, tip_eligible, active")
      .eq("restaurant_id", restaurant.id);

    const { data: entries } = await context.supabase
      .from("time_entries")
      .select("employee_id, work_date, minutes")
      .eq("restaurant_id", restaurant.id)
      .gte("work_date", weekStart)
      .lte("work_date", weekEnd);

    const { data: pools } = await context.supabase
      .from("tip_pools")
      .select("pool_date, area, amount")
      .eq("restaurant_id", restaurant.id)
      .gte("pool_date", weekStart)
      .lte("pool_date", weekEnd);

    const minutesByEmployeeDay: Record<string, number> = {};
    for (const entry of entries ?? []) {
      const key = `${entry.employee_id}|${entry.work_date}`;
      minutesByEmployeeDay[key] = (minutesByEmployeeDay[key] ?? 0) + (entry.minutes ?? 0);
    }

    const staff = (employees ?? []).map((e) => ({
      id: e.id,
      area: e.area as PayArea,
      hourlyRate: Number(e.hourly_rate ?? 0),
      payMethod: e.pay_method as PayMethod,
      tipEligible: e.tip_eligible,
      minutesByDay: days.map((d) => minutesByEmployeeDay[`${e.id}|${d}`] ?? 0),
    }));

    const shares = computeTipShares(staff, days, (pools ?? []).map((p) => ({
      poolDate: p.pool_date,
      area: p.area as PoolArea,
      amount: Number(p.amount ?? 0),
    })));

    let periodId: string;
    const { data: existing } = await context.supabase
      .from("payroll_periods")
      .select("id, status")
      .eq("restaurant_id", restaurant.id)
      .eq("start_date", weekStart)
      .maybeSingle();

    if (existing) {
      if (existing.status === "paid") {
        throw new Error("This week is already closed as paid. Reopen it before rebuilding.");
      }
      periodId = existing.id;
    } else {
      const { data: created, error } = await context.supabase
        .from("payroll_periods")
        .insert({ restaurant_id: restaurant.id, start_date: weekStart, end_date: weekEnd })
        .select("id")
        .single();
      if (error) throw error;
      periodId = created.id;
    }

    const { data: existingLines } = await context.supabase
      .from("payroll_lines")
      .select("id, employee_id, adjustments, paid, note")
      .eq("period_id", periodId);

    const rows = staff
      .map((person) => {
        const hours = minutesToHours(person.minutesByDay.reduce((a, b) => a + b, 0));
        const tips = Math.round((shares[person.id] ?? 0) * 100) / 100;
        const previous = (existingLines ?? []).find((l) => l.employee_id === person.id);
        const adjustments = Number(previous?.adjustments ?? 0);
        const wages = Math.round(hours * person.hourlyRate * 100) / 100;
        return {
          restaurant_id: restaurant.id,
          period_id: periodId,
          employee_id: person.id,
          hours,
          hourly_rate: person.hourlyRate,
          wages,
          tips,
          adjustments,
          total: Math.round((wages + tips + adjustments) * 100) / 100,
          pay_method: person.payMethod,
          paid: previous?.paid ?? false,
          note: previous?.note ?? null,
        };
      })
      .filter((row) => row.hours > 0 || row.tips > 0 || row.adjustments !== 0);

    if (rows.length > 0) {
      const { error } = await context.supabase
        .from("payroll_lines")
        .upsert(rows, { onConflict: "period_id,employee_id" });
      if (error) throw error;
    }

    return { periodId, people: rows.length };
  });

export const updatePayrollLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { lineId: string; adjustments?: number; note?: string | null; payMethod?: PayMethod }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const { data: line } = await context.supabase
      .from("payroll_lines")
      .select("id, wages, tips, adjustments")
      .eq("id", data.lineId)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (!line) throw new Error("Pay row not found.");

    const adjustments =
      data.adjustments === undefined ? Number(line.adjustments ?? 0) : Number(data.adjustments) || 0;

    const update: {
      adjustments: number;
      total: number;
      note?: string | null;
      pay_method?: PayMethod;
    } = {
      adjustments,
      total:
        Math.round((Number(line.wages ?? 0) + Number(line.tips ?? 0) + adjustments) * 100) / 100,
    };
    if (data.note !== undefined) update.note = data.note?.trim() || null;
    if (data.payMethod) update.pay_method = data.payMethod;

    const { error } = await context.supabase
      .from("payroll_lines")
      .update(update)
      .eq("id", data.lineId);
    if (error) throw error;
    return { ok: true };
  });

/** Marking cash as handed over — this is the payout record. */
export const markPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lineId: string; paid: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const update: {
      paid: boolean;
      paid_at: string | null;
      paid_by: string | null;
      acknowledged_at?: string | null;
    } = {
      paid: data.paid,
      paid_at: data.paid ? new Date().toISOString() : null,
      paid_by: data.paid ? context.userId : null,
    };
    if (!data.paid) update.acknowledged_at = null;

    const { error } = await context.supabase
      .from("payroll_lines")
      .update(update)
      .eq("id", data.lineId)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });

export const closePayrollWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { periodId: string; status: "draft" | "paid" }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const { error } = await context.supabase
      .from("payroll_periods")
      .update({
        status: data.status,
        paid_at: data.status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", data.periodId)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });

/** Staff-facing: my clock status, my hours this week, my recent pay. */
export const getMyTimeclock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const shift = parseShiftSettings(restaurant.settings);
    const { weekStartsOn } = parsePayrollSettings(restaurant.settings);
    const todayDate = localNow(shift.timezone).date;
    const weekStart = weekStartDate(todayDate, weekStartsOn);
    const days = weekDays(weekStart);
    const weekEnd = days[6]!;

    const { data: employee } = await context.supabase
      .from("employees")
      .select("id, full_name, area, position, hourly_rate, pay_method, tip_eligible")
      .eq("restaurant_id", restaurant.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!employee) {
      return {
        restaurantName: restaurant.name,
        timezone: shift.timezone,
        employee: null,
        weekStart,
        weekEnd,
        entries: [],
        openEntry: null,
        weekHours: 0,
        pay: [],
      };
    }

    const { data: entries } = await context.supabase
      .from("time_entries")
      .select("id, work_date, clock_in, clock_out, minutes, source, note")
      .eq("employee_id", employee.id)
      .gte("work_date", weekStart)
      .lte("work_date", weekEnd)
      .order("work_date", { ascending: false });

    const { data: pay } = await context.supabase
      .from("payroll_lines")
      .select(
        "id, hours, hourly_rate, wages, tips, adjustments, total, pay_method, paid, paid_at, acknowledged_at, payroll_periods(start_date, end_date, status)",
      )
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(8);

    const list = entries ?? [];
    const openEntry = list.find((e) => e.clock_in && !e.clock_out) ?? null;

    return {
      restaurantName: restaurant.name,
      timezone: shift.timezone,
      employee: {
        id: employee.id,
        fullName: employee.full_name,
        area: employee.area as PayArea,
        position: employee.position,
        hourlyRate: Number(employee.hourly_rate ?? 0),
        payMethod: employee.pay_method as PayMethod,
        tipEligible: employee.tip_eligible,
      },
      weekStart,
      weekEnd,
      entries: list.map((e) => ({
        id: e.id,
        workDate: e.work_date,
        clockIn: e.clock_in,
        clockOut: e.clock_out,
        minutes: e.minutes ?? 0,
        source: e.source as "clock" | "manual",
        note: e.note,
      })),
      openEntry: openEntry ? { id: openEntry.id, clockIn: openEntry.clock_in } : null,
      weekHours: minutesToHours(list.reduce((sum, e) => sum + (e.minutes ?? 0), 0)),
      pay: (pay ?? []).map((p) => {
        const period = p.payroll_periods as unknown as {
          start_date: string;
          end_date: string;
          status: string;
        } | null;
        return {
          id: p.id,
          startDate: period?.start_date ?? null,
          endDate: period?.end_date ?? null,
          hours: Number(p.hours ?? 0),
          wages: Number(p.wages ?? 0),
          tips: Number(p.tips ?? 0),
          adjustments: Number(p.adjustments ?? 0),
          total: Number(p.total ?? 0),
          payMethod: p.pay_method as PayMethod,
          paid: p.paid,
          paidAt: p.paid_at,
          acknowledgedAt: p.acknowledged_at,
        };
      }),
    };
  });

export const clockIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { employeeId?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);

    const employeeId = await resolveEmployeeId(
      context.supabase,
      restaurant.id,
      context.userId,
      data.employeeId ?? null,
      canManage(restaurant.role),
    );

    const { data: open } = await context.supabase
      .from("time_entries")
      .select("id")
      .eq("employee_id", employeeId)
      .is("clock_out", null)
      .not("clock_in", "is", null)
      .maybeSingle();
    if (open) throw new Error("Already clocked in.");

    const now = new Date().toISOString();
    const { error } = await context.supabase.from("time_entries").insert({
      restaurant_id: restaurant.id,
      employee_id: employeeId,
      work_date: localNow(parseShiftSettings(restaurant.settings).timezone).date,
      clock_in: now,
      minutes: 0,
      source: "clock",
      entered_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const clockOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { employeeId?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);

    const employeeId = await resolveEmployeeId(
      context.supabase,
      restaurant.id,
      context.userId,
      data.employeeId ?? null,
      canManage(restaurant.role),
    );

    const { data: open } = await context.supabase
      .from("time_entries")
      .select("id, clock_in")
      .eq("employee_id", employeeId)
      .is("clock_out", null)
      .not("clock_in", "is", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!open?.clock_in) throw new Error("Not clocked in.");

    const end = new Date();
    const minutes = Math.max(
      0,
      Math.round((end.getTime() - new Date(open.clock_in).getTime()) / 60000),
    );

    const { error } = await context.supabase
      .from("time_entries")
      .update({ clock_out: end.toISOString(), minutes })
      .eq("id", open.id);
    if (error) throw error;
    return { ok: true, minutes };
  });

export const acknowledgePay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lineId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("payroll_lines")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", data.lineId);
    if (error) throw error;
    return { ok: true };
  });

async function resolveEmployeeId(
  supabase: SupabaseClient,
  restaurantId: string,
  userId: string,
  requestedId: string | null,
  isManager: boolean,
) {
  if (requestedId) {
    if (!isManager) throw new Error("Only owners and managers can clock in someone else.");
    return requestedId;
  }
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!employee) {
    throw new Error("You don't have an employee record yet. Ask a manager to add you.");
  }
  return employee.id as string;
}
