import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

const clockTime = z
  .string()
  .trim()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use a time like 09:30 or 17:00.")
  .nullish()
  .or(z.literal(""));

const shiftSchema = z
  .object({
    id: z.string().uuid().nullish(),
    employeeId: z.string().uuid("Pick an employee."),
    shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    area: z.enum(["foh", "boh", "both"]),
    shift: z.enum(["opening", "mid", "closing", "all-day"]),
    startTime: clockTime,
    endTime: clockTime,
    note: z.string().trim().max(500).nullish(),
  })
  // An end time earlier than the start is an overnight shift (e.g. 17:00 to 01:00), which is fine.
  .refine((v) => !v.startTime || !v.endTime || v.startTime !== v.endTime, {
    message: "The shift can't start and end at the same time.",
    path: ["endTime"],
  });

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
  .inputValidator((input: ScheduleShiftInput) => shiftSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const row = {
      restaurant_id: restaurant.id,
      employee_id: data.employeeId,
      shift_date: data.shiftDate,
      area: data.area,
      shift: data.shift,
      start_time: data.startTime || null,
      end_time: data.endTime || null,
      note: data.note || null,
    };

    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("staff_schedules")
        .update(row)
        .eq("id", data.id)
        .eq("restaurant_id", restaurant.id)
        .select("id");
      if (error) throw error;
      if (!updated?.length) throw new Error("That shift no longer exists.");
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
