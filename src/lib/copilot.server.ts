import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import type { Database } from "@/integrations/supabase/types";
import { aiErrorMessage, getChatModel, isAiConfigured } from "./ai.server";

export function userSupabase(request: Request) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const supabase = createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { supabase, token };
}

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function handleCopilot(request: Request) {
  if (!isAiConfigured()) return json(503, "IQ isn't set up for this workspace yet.");
  const { supabase, token } = userSupabase(request);
  if (!token) return json(401, "Please sign in");
  const { data: auth } = await supabase.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json(401, "Please sign in");

  let body: { messages?: UIMessage[]; threadId?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, "Invalid request");
  }
  const threadId = String(body.threadId ?? "");
  // Only the newest user turn comes from the client. History is loaded from
  // what we stored, so a client can't inject fake assistant turns.
  const incoming = Array.isArray(body.messages)
    ? body.messages[body.messages.length - 1]
    : undefined;
  const text = (incoming?.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n")
    .trim()
    .slice(0, 8000);
  if (!threadId || incoming?.role !== "user" || !text || typeof incoming.id !== "string") {
    return json(400, "Missing message");
  }
  const userMessage: UIMessage = {
    id: incoming.id.slice(0, 100),
    role: "user",
    parts: [{ type: "text", text }],
  };

  const { data: thread } = await supabase
    .from("copilot_threads")
    .select("id, title, restaurant_id")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!thread) return json(404, "Conversation not found");

  const { resolveActiveRestaurant, NoRestaurantError } = await import("./tenant.server");
  let restaurant: Awaited<ReturnType<typeof resolveActiveRestaurant>>;
  try {
    restaurant = await resolveActiveRestaurant(supabase as never, user.id);
  } catch (error) {
    if (error instanceof NoRestaurantError) return json(403, "Join a restaurant to use IQ.");
    throw error;
  }
  if (restaurant.id !== thread.restaurant_id)
    return json(403, "Switch to this conversation's restaurant first");

  const { data: stored } = await supabase
    .from("copilot_messages")
    .select("message_id, role, parts")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(40);
  const history: UIMessage[] = (stored ?? [])
    .reverse()
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.message_id !== userMessage.id)
    .map((m) => ({
      id: m.message_id,
      role: m.role as "user" | "assistant",
      parts: m.parts as UIMessage["parts"],
    }));
  const messages = [...history, userMessage];

  const { buildCopilotContext } = await import("./copilot-context.server");
  const { data, alerts } = await buildCopilotContext(supabase as never, user.id, restaurant);

  const { error: saveError } = await supabase.from("copilot_messages").upsert(
    {
      thread_id: threadId,
      user_id: user.id,
      message_id: userMessage.id,
      role: "user",
      parts: userMessage.parts as never,
    },
    { onConflict: "thread_id,message_id" },
  );
  if (saveError) console.error("copilot save user msg", saveError.message);
  if (thread.title === "New chat") {
    await supabase
      .from("copilot_threads")
      .update({ title: text.slice(0, 60) })
      .eq("id", threadId);
  }

  const system = `You are "IQ", the virtual manager and copilot for ${restaurant.name}, a restaurant using Restrolytics.
Answer only from the DATA below; if something isn't in the data, say so plainly and suggest where to record or upload it in the app (Sales → Toast/Uber Eats/DoorDash/Grubhub uploads, Inventory, Shifts, Payroll).
Be concise and practical, like an experienced general manager: lead with the answer, use short bullet points and small tables, show dollar amounts, and end with 1-3 concrete next actions when useful.
When asked for a daily briefing, cover yesterday and today: sales by channel (POS summaries + delivery platforms), errors/refunds, items not available, labor/hours, low stock, schedule for today, and open tasks.
Respect the user's role: ${restaurant.role}. ${restaurant.role === "staff" ? "Staff can only see their own hours, pay, schedule and tasks; politely decline anything else." : ""}
Current alerts: ${JSON.stringify(alerts)}
DATA (JSON):
${JSON.stringify(data)}`;

  const result = streamText({
    model: getChatModel(),
    system,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onError: (e) => aiErrorMessage(e),
    onFinish: async ({ responseMessage }) => {
      const { error } = await supabase.from("copilot_messages").upsert(
        {
          thread_id: threadId,
          user_id: user.id,
          message_id: responseMessage.id,
          role: "assistant",
          parts: responseMessage.parts as never,
        },
        { onConflict: "thread_id,message_id" },
      );
      if (error) console.error("copilot save reply", error.message);
      await supabase
        .from("copilot_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
    },
  });
}
