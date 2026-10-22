import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { localNow, parseShiftSettings } from "./operating-day";
import { parsePayrollSettings } from "./payroll";
import { rangeDates, type ScheduleRange } from "./schedule";

export type ScheduleShiftInput = {
  id?: string | null;
  employeeId: string;
  shiftDate: string;
  area: "foh" | "boh" | "both";
  shift: "opening" | "mid" | "closing" | "all-day";
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
};

export const getSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { range: ScheduleRange }) => input)
  .handler(async ({ data, context }) => {
    const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const today = localNow(parseShiftSettings(restaurant.settings).timezone).date;
    const { weekStartsOn } = parsePayrollSettings(restaurant.settings);
    const { start, end } = rangeDates(data.range, today, weekStartsOn);

    const { data: rows, error } = await context.supabase
      .from("staff_schedules")
      .select(
        "id, shift_date, area, shift, start_time, end_time, note, employee_id, employees(full_name, position)",
      )
      .eq("restaurant_id", restaurant.id)
      .gte("shift_date", start)
      .lte("shift_date", end)
      .order("shift_date")
      .order("start_time", { nullsFirst: false });
    if (error) throw error;

    const { data: employees } = await context.supabase
      .from("employees")
      .select("id, full_name, area, position")
      .eq("restaurant_id", restaurant.id)
      .eq("active", true)
      .order("full_name");

    type Row = {
      id: string;
      shift_date: string;
      area: string;
      shift: string;
      start_time: string | null;
      end_time: string | null;
      note: string | null;
      employee_id: string;
      employees: { full_name: string; position: string | null } | null;
    };

    return {
      today,
      start,
      end,
      canManage: canManage(restaurant.role),
      employees: (employees ?? []).map((e) => ({
        id: e.id,
        name: e.full_name,
        area: e.area as "foh" | "boh" | "both",
        position: e.position ?? null,
      })),
      shifts: ((rows ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        date: r.shift_date,
        area: r.area,
        shift: r.shift,
        startTime: r.start_time,
        endTime: r.end_time,
        note: r.note,
        employeeId: r.employee_id,
        name: r.employees?.full_name ?? "Unknown",
        position: r.employees?.position ?? null,
      })),
    };
  });

export const saveScheduleShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ScheduleShiftInput) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    if (!data.employeeId) throw new Error("Pick an employee");
    if (!data.shiftDate) throw new Error("Pick a date");

    const row = {
      restaurant_id: restaurant.id,
      employee_id: data.employeeId,
      shift_date: data.shiftDate,
      area: data.area,
      shift: data.shift,
      start_time: data.startTime?.trim() ? data.startTime.trim() : null,
      end_time: data.endTime?.trim() ? data.endTime.trim() : null,
      note: data.note?.trim() ? data.note.trim() : null,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("staff_schedules")
        .update(row)
        .eq("id", data.id)
        .eq("restaurant_id", restaurant.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase
        .from("staff_schedules")
        .insert({ ...row, created_by: context.userId });
      if (error) throw error;
    }

    return { ok: true };
  });

export const deleteScheduleShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("staff_schedules")
      .delete()
      .eq("id", data.id)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });
