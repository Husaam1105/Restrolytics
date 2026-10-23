import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Wand2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MessageResponse } from "@/components/ai-elements/message";
import { ChatPane, ensureThread, NotesPanel, TasksPanel } from "@/components/manager/manager-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { getManagerContext, iqManagerAssist } from "@/lib/manager.functions";
import { cn } from "@/lib/utils";
import { PageContainer, PageHeader } from "@/components/page";
import { EmptyState } from "@/components/states";

export const Route = createFileRoute("/_authenticated/manager-console")({
  head: () => ({
    meta: [
      { title: "Manager console · Restrolytics" },
      { name: "description", content: "Restrolytics staff console for live chat, task assignment and note review across restaurants." },
    ],
  }),
  component: Console,
});

function Console() {
  const fetchCtx = useServerFn(getManagerContext);
  const assist = useServerFn(iqManagerAssist);
  const ctx = useQuery({ queryKey: ["mgr-context"], queryFn: () => fetchCtx() });
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [threadId, setThreadId] = useState<string>("");
  const [draft, setDraft] = useState<string>();
  const [summary, setSummary] = useState<string>();

  useEffect(() => {
    if (!restaurantId && ctx.data?.restaurants[0]) setRestaurantId(ctx.data.restaurants[0].id);
  }, [ctx.data, restaurantId]);

  const threads = useQuery({
    queryKey: ["mgr-threads", restaurantId],
    enabled: !!restaurantId,
    refetchInterval: 15000,
    queryFn: async () => {
      await ensureThread(restaurantId, "team");
      const { data, error } = await supabase
        .from("manager_threads")
        .select("id, kind, member_name, updated_at")
        .eq("restaurant_id", restaurantId)
        .order("kind", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (threads.data && !threads.data.some((t) => t.id === threadId)) setThreadId(threads.data[0]?.id ?? "");
  }, [threads.data, threadId]);

  const suggest = useMutation({
    mutationFn: () => assist({ data: { restaurantId, threadId, mode: "reply" } }),
    onSuccess: (r) => setDraft(r.text),
    onError: (e) => toast.error((e as Error).message),
  });
  const summarize = useMutation({
    mutationFn: () => assist({ data: { restaurantId, mode: "summary" } }),
    onSuccess: (r) => setSummary(r.text),
    onError: (e) => toast.error((e as Error).message),
  });
  const clearDraft = useCallback(() => setDraft(undefined), []);

  if (ctx.isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!ctx.data?.isPlatformStaff) {
    return (
      <PageContainer>
        <EmptyState title="This console is for Restrolytics staff" description="If you need help, open Live manager under IQ Copilot." />
      </PageContainer>
    );
  }
  const me = { userId: ctx.data.userId, name: "Restrolytics Manager", isPlatformStaff: true };

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader context="Restrolytics" title="Manager console" description="Chat with teams, assign tasks and review notes." />
        <div className="flex gap-2">
          <Select value={restaurantId} onValueChange={(v) => { setRestaurantId(v); setThreadId(""); setSummary(undefined); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Pick a restaurant" /></SelectTrigger>
            <SelectContent>
              {ctx.data.restaurants.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => summarize.mutate()} disabled={!restaurantId || summarize.isPending}>
            {summarize.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} IQ summary
          </Button>
        </div>
      </div>
      {summary ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">What needs attention</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSummary(undefined)}>Close</Button>
          </CardHeader>
          <CardContent className="text-sm"><MessageResponse>{summary}</MessageResponse></CardContent>
        </Card>
      ) : null}
      {restaurantId ? (
        <Tabs defaultValue="chat">
          <TabsList>
            <TabsTrigger value="chat">Chats</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="chat">
            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
              <div className="flex flex-col gap-1">
                {(threads.data ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThreadId(t.id)}
                    className={cn("rounded-md px-3 py-2 text-left text-sm hover:bg-muted", t.id === threadId && "bg-muted font-medium")}
                  >
                    {t.kind === "team" ? "Team channel" : t.member_name ?? "Private chat"}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => suggest.mutate()} disabled={!threadId || suggest.isPending}>
                    {suggest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} IQ suggest reply
                  </Button>
                </div>
                {threadId ? <ChatPane key={threadId} threadId={threadId} me={me} draft={draft} onDraftUsed={clearDraft} /> : null}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="tasks"><TasksPanel key={restaurantId} restaurantId={restaurantId} me={me} canAssign /></TabsContent>
          <TabsContent value="notes"><NotesPanel key={restaurantId} restaurantId={restaurantId} me={me} canReview /></TabsContent>
        </Tabs>
      ) : null}
    </PageContainer>
  );
}
