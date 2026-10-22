import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isPlatformStaff(supabase: { rpc: (fn: "is_platform_staff") => PromiseLike<{ data: unknown }> }) {
  const { data } = await supabase.rpc("is_platform_staff");
  return data === true;
}

/** Who is signed in, which restaurant they're in, and whether they're Restrolytics staff. */
export const getManagerContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const staff = await isPlatformStaff(context.supabase as never);
    const email = String((context.claims as { email?: string }).email ?? "");
    let restaurant: { id: string; name: string; role: string } | null = null;
    try {
      const { resolveActiveRestaurant } = await import("./tenant.server");
      const r = await resolveActiveRestaurant(context.supabase, context.userId);
      restaurant = { id: r.id, name: r.name, role: r.role };
    } catch {
      restaurant = null;
    }
    const { data: emp } = await context.supabase
      .from("employees")
      .select("full_name")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    const name = emp?.full_name || email.split("@")[0] || "Team member";
    let restaurants: { id: string; name: string }[] = [];
    if (staff) {
      const { data } = await context.supabase.from("restaurants").select("id, name").order("name");
      restaurants = data ?? [];
    }
    return { userId: context.userId, name, isPlatformStaff: staff, restaurant, restaurants };
  });

/** IQ helps Restrolytics staff: suggest a reply for a thread, or summarize open work. */
export const iqManagerAssist = createServerFn({ method: "POST" })
  .inputValidator((d: { restaurantId: string; threadId?: string; mode: "reply" | "summary" }) => ({
    restaurantId: String(d.restaurantId),
    threadId: d.threadId ? String(d.threadId) : undefined,
    mode: d.mode === "reply" ? ("reply" as const) : ("summary" as const),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    if (!(await isPlatformStaff(context.supabase as never))) throw new Error("Only Restrolytics staff can use this.");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");
    const sb = context.supabase;
    const [{ data: rest }, { data: tasks }, { data: notes }] = await Promise.all([
      sb.from("restaurants").select("name").eq("id", data.restaurantId).maybeSingle(),
      sb.from("manager_tasks").select("title, assigned_name, due_date, status, completion_note").eq("restaurant_id", data.restaurantId).order("created_at", { ascending: false }).limit(50),
      sb.from("manager_notes").select("author_name, category, body, status, created_at").eq("restaurant_id", data.restaurantId).order("created_at", { ascending: false }).limit(50),
    ]);
    let messages: { author_name: string | null; from_manager: boolean; body: string; created_at: string }[] = [];
    if (data.threadId) {
      const { data: m } = await sb
        .from("manager_messages")
        .select("author_name, from_manager, body, created_at")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: false })
        .limit(40);
      messages = (m ?? []).reverse();
    }
    const task =
      data.mode === "reply"
        ? "Draft the next reply the Restrolytics manager should send in this conversation. Reply with only the message text: friendly, specific, short (under 80 words)."
        : "Summarize what needs attention: open tasks (overdue first), unreviewed notes, and unanswered questions from the chat. Use short bullets and end with the top 3 actions.";
    const prompt = `You assist a live Restrolytics manager supporting the team at ${rest?.name ?? "a restaurant"}.
${task}
TASKS: ${JSON.stringify(tasks ?? [])}
NOTES: ${JSON.stringify(notes ?? [])}
CONVERSATION: ${JSON.stringify(messages)}`;

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./run-id.server");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        prompt,
        providerOptions: {
          openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
        },
      });
      return { text: (await result.text).trim() };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 402) throw new Error("AI credits have run out. Add credits in Settings → Plans & credits.");
      if (status === 429) throw new Error("Too many requests right now. Please wait a moment.");
      throw new Error("IQ couldn't help right now. Please try again.");
    }
  });
