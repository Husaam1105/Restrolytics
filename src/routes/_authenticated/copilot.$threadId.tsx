import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessagesSquare } from "lucide-react";
import { toast } from "sonner";

import iqLogo from "@/assets/iq-copilot.png";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ThreadList } from "@/components/copilot/thread-list";
import { PageContainer } from "@/components/page";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getCopilotMessages } from "@/lib/copilot.functions";

export const Route = createFileRoute("/_authenticated/copilot/$threadId")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s['q'] === "string" && s['q'] ? { q: (s['q'] as string).slice(0, 500) } : {},
  head: () => ({
    meta: [
      { title: "Chat with IQ · Restrolytics" },
      { name: "description", content: "Ask IQ, your virtual restaurant manager, about sales, labor, inventory and tasks." },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const fetchMessages = useServerFn(getCopilotMessages);
  const [chatsOpen, setChatsOpen] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["copilot-messages", threadId],
    queryFn: () => fetchMessages({ data: { id: threadId } }),
    staleTime: Infinity,
  });
  return (
    <PageContainer className="space-y-4">
      {/* Phones and tablets: the chat list lives in a sheet. */}
      <div className="lg:hidden">
        <Sheet open={chatsOpen} onOpenChange={setChatsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <MessagesSquare />
              Your chats
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-4">
            <SheetHeader className="px-0">
              <SheetTitle>Your chats</SheetTitle>
            </SheetHeader>
            <ThreadList activeId={threadId} onNavigate={() => setChatsOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <ThreadList activeId={threadId} />
        </aside>
        {error ? (
          <ErrorState title="This chat didn't load" error={error} onRetry={() => void refetch()} />
        ) : isLoading || !data ? (
          <LoadingState rows={4} />
        ) : (
          <ChatWindow key={threadId} threadId={threadId} initial={data.messages as UIMessage[]} />
        )}
      </div>
    </PageContainer>
  );
}

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const { q } = Route.useSearch();
  const sentQ = useRef(false);
  const qc = useQueryClient();
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/copilot",
      body: { threadId },
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      },
    }),
    onFinish: () => qc.invalidateQueries({ queryKey: ["copilot-threads"] }),
    onError: (e) => toast.error(readableError(e)),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!q || initial.length > 0 || sentQ.current) return;
    const key = `iq-sent-${threadId}`;
    if (sessionStorage.getItem(key)) return;
    const t = setTimeout(() => {
      sentQ.current = true;
      sessionStorage.setItem(key, "1");
      sendMessage({ text: q });
    }, 50);
    return () => clearTimeout(t);
  }, [q, initial.length, sendMessage, threadId]);

  return (
    <div className="surface flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col overflow-hidden">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={iqLogo} alt="" className="h-12 w-12" />}
              title="Ask IQ anything"
              description="Sales, fees, labor, schedule, stock and tasks, answered from your own data."
            />
          ) : null}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : undefined}>
                {m.parts.map((p, i) =>
                  p.type === "text" ? (
                    m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <span key={i} className="whitespace-pre-wrap">{p.text}</span>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Checking your numbers…</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-3">
        <PromptInput
          onSubmit={(msg) => {
            const text = msg.text?.trim();
            if (!text || busy) return;
            sendMessage({ text });
          }}
        >
          <PromptInputTextarea placeholder="Ask about sales, staff, inventory…" autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

/** The API returns {"error": "..."} JSON; show that sentence, not the raw payload. */
function readableError(e: Error) {
  try {
    const parsed = JSON.parse(e.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // not JSON
  }
  return e.message || "IQ couldn't answer. Try again in a moment.";
}
