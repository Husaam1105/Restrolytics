import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_SHIFT_SETTINGS,
  normalizeTime,
  operatingDate,
  parseShiftSettings,
  servicePhase,
  type ShiftSettings,
} from "./operating-day";

import { DEFAULT_TASKS as DEFAULTS, seedRows } from "./shift-defaults";

export type TaskArea = "foh" | "boh";
export type TaskShift = "opening" | "closing";
export type InputType = "none" | "text" | "number" | "temperature";

export const getShiftChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { area: TaskArea; shift: TaskShift }) => input)
  .handler(async ({ data, context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { supabase } = context;

    const select = () =>
      supabase
        .from("shift_tasks")
        .select("id, title, details, sort_order, active, input_type, input_label, input_unit")
        .eq("restaurant_id", restaurant.id)
        .eq("area", data.area)
        .eq("shift", data.shift)
        .eq("active", true)
        .order("sort_order");

    let { data: tasks, error } = await select();
    if (error) throw error;

    // Only owners/managers may create the starter list; staff just read it.
    if ((!tasks || tasks.length === 0) && restaurant.role !== "staff") {
      const { error: seedError } = await supabase
        .from("shift_tasks")
        .insert(seedRows(restaurant.id, data.area, data.shift));
      if (seedError) throw seedError;
      const refreshed = await select();
      if (refreshed.error) throw refreshed.error;
      tasks = refreshed.data;
    }

    const settings = parseShiftSettings(restaurant.settings);
    const date = operatingDate(settings);
    const { data: done } = await supabase
      .from("shift_task_completions")
      .select("task_id, completed_at, completed_by, completed_by_email, value, photo_path")
      .eq("restaurant_id", restaurant.id)
      .eq("task_date", date);

    const photoPaths = (done ?? []).map((d) => d.photo_path).filter((p): p is string => Boolean(p));
    const signedUrls = new Map<string, string>();
    if (photoPaths.length) {
      const { data: signed } = await supabase.storage
        .from("task-photos")
        .createSignedUrls(photoPaths, 60 * 60);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) signedUrls.set(s.path, s.signedUrl);
      }
    }

    const doneMap = new Map(
      (done ?? []).map((d) => [
        d.task_id,
        {
          completedAt: d.completed_at,
          completedBy: d.completed_by_email ?? null,
          value: d.value ?? null,
          photoUrl: d.photo_path ? (signedUrls.get(d.photo_path) ?? null) : null,
        },
      ]),
    );

    const { data: notes } = await supabase
      .from("shift_task_notes")
      .select("id, task_id, note, author_email, created_at")
      .eq("restaurant_id", restaurant.id)
      .eq("task_date", date)
      .order("created_at");

    const notesByTask = new Map<string, { id: string; note: string; author: string | null; createdAt: string }[]>();
    for (const n of notes ?? []) {
      const list = notesByTask.get(n.task_id) ?? [];
      list.push({ id: n.id, note: n.note, author: n.author_email, createdAt: n.created_at });
      notesByTask.set(n.task_id, list);
    }

    return {
      restaurantName: restaurant.name,
      date,
      settings,
      phase: servicePhase(settings),
      tasks: (tasks ?? []).map((t) => ({
        ...t,
        inputType: (t.input_type ?? "none") as InputType,
        inputLabel: t.input_label ?? null,
        inputUnit: t.input_unit ?? null,
        completed: doneMap.has(t.id),
        completedAt: doneMap.get(t.id)?.completedAt ?? null,
        completedBy: doneMap.get(t.id)?.completedBy ?? null,
        value: doneMap.get(t.id)?.value ?? null,
        photoUrl: doneMap.get(t.id)?.photoUrl ?? null,
        notes: notesByTask.get(t.id) ?? [],
      })),
    };
  });

export const addTaskNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string; note: string }) => input)
  .handler(async ({ data, context }) => {
    const note = data.note.trim();
    if (!note) throw new Error("Comment is required");

    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);

    const { error } = await context.supabase.from("shift_task_notes").insert({
      restaurant_id: restaurant.id,
      task_id: data.taskId,
      task_date: operatingDate(parseShiftSettings(restaurant.settings)),
      author_id: context.userId,
      author_email: (context.claims.email as string | undefined) ?? null,
      note,
    });
    if (error) throw error;

    return { ok: true };
  });

export const setTaskCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string; completed: boolean; value?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const date = operatingDate(parseShiftSettings(restaurant.settings));

    if (data.completed) {
      const { error } = await context.supabase.from("shift_task_completions").upsert(
        {
          restaurant_id: restaurant.id,
          task_id: data.taskId,
          task_date: date,
          completed_by: context.userId,
          completed_by_email: (context.claims.email as string | undefined) ?? null,
          value: data.value?.trim() ? data.value.trim() : null,
        },
        { onConflict: "task_id,task_date" },
      );
      if (error) throw error;
    } else {
      const { error } = await context.supabase
        .from("shift_task_completions")
        .delete()
        .eq("task_id", data.taskId)
        .eq("task_date", date);
      if (error) throw error;
    }

    return { ok: true };
  });

/** Attach a photo to a task as proof of completion; also marks the task done. */
export const uploadTaskPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string; dataUrl: string; fileName?: string }) => input)
  .handler(async ({ data, context }) => {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Please choose a photo (JPG, PNG or HEIC).");
    const mime = match[1]!;
    const base64 = match[2]!;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.length > 10 * 1024 * 1024) throw new Error("That photo is larger than 10 MB.");

    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const date = operatingDate(parseShiftSettings(restaurant.settings));

    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${restaurant.id}/${data.taskId}/${date}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await context.supabase.storage
      .from("task-photos")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) throw upErr;

    const { error } = await context.supabase.from("shift_task_completions").upsert(
      {
        restaurant_id: restaurant.id,
        task_id: data.taskId,
        task_date: date,
        completed_by: context.userId,
        completed_by_email: (context.claims.email as string | undefined) ?? null,
        photo_path: path,
      },
      { onConflict: "task_id,task_date" },
    );
    if (error) throw error;

    const { data: signed } = await context.supabase.storage
      .from("task-photos")
      .createSignedUrl(path, 60 * 60);

    return { ok: true, photoUrl: signed?.signedUrl ?? null };
  });

export const addShiftTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      area: TaskArea;
      shift: TaskShift;
      title: string;
      inputType?: InputType;
      inputLabel?: string | null;
      inputUnit?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const title = data.title.trim();
    if (!title) throw new Error("Task name is required");


    const { data: last } = await context.supabase
      .from("shift_tasks")
      .select("sort_order")
      .eq("restaurant_id", restaurant.id)
      .eq("area", data.area)
      .eq("shift", data.shift)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const inputType = data.inputType ?? "none";
    const { error } = await context.supabase.from("shift_tasks").insert({
      restaurant_id: restaurant.id,
      area: data.area,
      shift: data.shift,
      title,
      sort_order: (last?.sort_order ?? 0) + 1,
      input_type: inputType,
      input_label:
        inputType === "none" ? null : data.inputLabel?.trim() || (inputType === "temperature" ? "Temperature" : "Reading"),
      input_unit: inputType === "temperature" ? (data.inputUnit?.trim() || "°F") : data.inputUnit?.trim() || null,
    });
    if (error) throw error;

    return { ok: true };
  });

export const removeShiftTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("shift_tasks")
      .update({ active: false })
      .eq("id", data.taskId).eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });

export const getShiftSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const settings = parseShiftSettings(restaurant.settings);
    return { settings, phase: servicePhase(settings), date: operatingDate(settings) };
  });

export const saveShiftSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { timezone: string; openTime: string; closeTime: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const next: ShiftSettings = {
      timezone: data.timezone.trim() || DEFAULT_SHIFT_SETTINGS.timezone,
      openTime: normalizeTime(data.openTime, DEFAULT_SHIFT_SETTINGS.openTime),
      closeTime: normalizeTime(data.closeTime, DEFAULT_SHIFT_SETTINGS.closeTime),
    };

    const existing = (restaurant.settings ?? {}) as Record<string, unknown>;
    const { error } = await context.supabase
      .from("restaurants")
      .update({ settings: { ...existing, shift: next } })
      .eq("id", restaurant.id);
    if (error) throw error;

    return { settings: next };
  });

/** Progress for all four checklists on the current operating day (drives reminders). */
export const getShiftProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const settings = parseShiftSettings(restaurant.settings);
    const date = operatingDate(settings);
    const { supabase } = context;

    const { data: tasks, error } = await supabase
      .from("shift_tasks")
      .select("id, area, shift")
      .eq("restaurant_id", restaurant.id)
      .eq("active", true);
    if (error) throw error;

    const { data: done } = await supabase
      .from("shift_task_completions")
      .select("task_id")
      .eq("restaurant_id", restaurant.id)
      .eq("task_date", date);
    const doneSet = new Set((done ?? []).map((d) => d.task_id));

    const groups: { area: TaskArea; shift: TaskShift; total: number; completed: number }[] = [];
    for (const area of ["foh", "boh"] as TaskArea[]) {
      for (const shift of ["opening", "closing"] as TaskShift[]) {
        const list = (tasks ?? []).filter((t) => t.area === area && t.shift === shift);
        groups.push({
          area,
          shift,
          total: list.length || DEFAULTS[area][shift].length,
          completed: list.filter((t) => doneSet.has(t.id)).length,
        });
      }
    }

    const { data: role } = await supabase.rpc("restaurant_role", { _restaurant_id: restaurant.id });
    const { data: emp } = await supabase
      .from("employees")
      .select("area")
      .eq("restaurant_id", restaurant.id)
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    const isStaff = role === "staff";
    const myArea = (emp?.area as TaskArea | undefined) ?? null;

    return {
      date,
      settings,
      phase: servicePhase(settings),
      groups,
      isStaff,
      myArea,
    };
  });
