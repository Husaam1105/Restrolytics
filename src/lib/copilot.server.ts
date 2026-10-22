import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.server";

const MODEL = "openai/gpt-6-astra";

export function userSupabase(request: Request) {
  const url = process.env['SUPABASE_URL']!;
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
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
  new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json" } });

export async function handleCopilot(request: Request) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) return json(500, "AI is not configured");
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
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const threadId = String(body.threadId ?? "");
  if (!messages.length || !threadId) return json(400, "Missing message");

  const { data: thread } = await supabase
    .from("copilot_threads")
    .select("id, title, restaurant_id")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!thread) return json(404, "Conversation not found");

  const { resolveActiveRestaurant } = await import("./tenant.server");
  const restaurant = await resolveActiveRestaurant(supabase as never, user.id);
  if (restaurant.id !== thread.restaurant_id) return json(403, "Switch to this conversation's restaurant first");
  const { buildCopilotContext } = await import("./copilot-context.server");
  const { data, alerts } = await buildCopilotContext(supabase as never, user.id, restaurant);

  // Save the latest user message
  const last = messages[messages.length - 1]!;
  if (last.role === "user") {
    const { error } = await supabase.from("copilot_messages").upsert(
      { thread_id: threadId, user_id: user.id, message_id: last.id, role: "user", parts: last.parts as never },
      { onConflict: "thread_id,message_id" },
    );
    if (error) console.error("copilot save user msg", error.message);
    if (thread.title === "New chat") {
      const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
      if (text) await supabase.from("copilot_threads").update({ title: text.slice(0, 60) }).eq("id", threadId);
    }
  }

  const system = `You are "IQ", the virtual manager and copilot for ${restaurant.name}, a restaurant using Restrolytics.
Answer only from the DATA below; if something isn't in the data, say so plainly and suggest where to record or upload it in the app (Sales → Toast/Uber Eats/DoorDash/Grubhub uploads, Inventory, Shifts, Payroll).
Be concise and practical, like an experienced general manager: lead with the answer, use short bullet points and small tables, show dollar amounts, and end with 1-3 concrete next actions when useful.
When asked for a daily briefing, cover yesterday and today: sales by channel (POS summaries + delivery platforms), errors/refunds, items not available, labor/hours, low stock, schedule for today, and open tasks.
Respect the user's role: ${restaurant.role}. ${restaurant.role === "staff" ? "Staff can only see their own hours, pay, schedule and tasks; politely decline anything else." : ""}
Current alerts: ${JSON.stringify(alerts)}
DATA (JSON):
${JSON.stringify(data)}`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(MODEL),
    system,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onError: (e) => {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 402) return "AI credits have run out. Add credits in Settings → Plans & credits.";
        if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
        return "IQ couldn't answer right now. Please try again.";
      },
      onFinish: async ({ responseMessage }) => {
        const { error } = await supabase.from("copilot_messages").upsert(
          { thread_id: threadId, user_id: user.id, message_id: responseMessage.id, role: "assistant", parts: responseMessage.parts as never },
          { onConflict: "thread_id,message_id" },
        );
        if (error) console.error("copilot save reply", error.message);
        await supabase.from("copilot_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
      },
    }),
    runIdFetch,
  );
}
