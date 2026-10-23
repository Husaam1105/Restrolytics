import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCopilotThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("copilot_threads")
      .select("id, title, updated_at")
      .eq("restaurant_id", restaurant.id)
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCopilotThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("copilot_threads")
      .insert({ restaurant_id: restaurant.id, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const deleteCopilotThread = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("copilot_threads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCopilotMessages = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { data: thread } = await context.supabase
      .from("copilot_threads")
      .select("id, title")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!thread) throw new Error("Conversation not found");
    const { data: rows, error } = await context.supabase
      .from("copilot_messages")
      .select("message_id, role, parts")
      .eq("thread_id", data.id)
      .order("created_at");
    if (error) throw new Error(error.message);
    return {
      thread,
      messages: (rows ?? []).map((r) => ({
        id: r.message_id,
        role: r.role as "user" | "assistant",
        parts: r.parts as never,
      })),
    };
  });

export const getCopilotAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { buildCopilotContext } = await import("./copilot-context.server");
    const { alerts } = await buildCopilotContext(context.supabase, context.userId, restaurant, {
      alertsOnly: true,
    });
    const { isAiConfigured } = await import("./ai.server");
    return {
      alerts,
      role: restaurant.role,
      restaurant: restaurant.name,
      aiReady: isAiConfigured(),
    };
  });
