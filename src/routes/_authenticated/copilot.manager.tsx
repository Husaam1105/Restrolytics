import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { ChatPane, ensureThread, NotesPanel, TasksPanel } from "@/components/manager/manager-panels";
import { PageContainer, PageHeader } from "@/components/page";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getManagerContext } from "@/lib/manager.functions";

export const Route = createFileRoute("/_authenticated/copilot/manager")({
  head: () => ({
    meta: [
      { title: "Live manager · Restrolytics" },
      { name: "description", content: "Chat live with your Restrolytics manager, track assigned tasks and log notes for review." },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  const fetchCtx = useServerFn(getManagerContext);
  const ctx = useQuery({ queryKey: ["mgr-context"], queryFn: () => fetchCtx() });
  const [room, setRoom] = useState<"team" | "direct">("team");
  const restaurantId = ctx.data?.restaurant?.id;
  const thread = useQuery({
    queryKey: ["mgr-thread", restaurantId, room, ctx.data?.userId],
    enabled: !!restaurantId,
    queryFn: () =>
      ensureThread(restaurantId!, room, room === "direct" ? { id: ctx.data!.userId, name: ctx.data!.name } : undefined),
  });

  if (ctx.isLoading) {
    return (
      <PageContainer>
        <LoadingState rows={3} />
      </PageContainer>
    );
  }
  if (!ctx.data?.restaurant) {
    return (
      <PageContainer>
        <EmptyState title="Join a restaurant to talk to a manager" description="Once you're on a team, your Restrolytics manager is here." />
      </PageContainer>
    );
  }
  const me = { userId: ctx.data.userId, name: ctx.data.name, isPlatformStaff: false };
  const isManager = ctx.data.restaurant.role !== "staff";

  return (
    <PageContainer>
      <PageHeader
        context="IQ Copilot"
        title="Live manager"
        description={`A real person from Restrolytics, here to help ${ctx.data.restaurant.name}.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/copilot">Back to IQ</Link>
            </Button>
            {ctx.data.isPlatformStaff ? (
              <Button asChild>
                <Link to="/manager-console">Open manager console</Link>
              </Button>
            ) : null}
          </>
        }
      />
      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes for review</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="space-y-3">
          <div className="flex gap-2" role="group" aria-label="Conversation">
            <Button size="sm" aria-pressed={room === "team"} variant={room === "team" ? "default" : "outline"} onClick={() => setRoom("team")}>
              Team channel
            </Button>
            <Button size="sm" aria-pressed={room === "direct"} variant={room === "direct" ? "default" : "outline"} onClick={() => setRoom("direct")}>
              Private with manager
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {room === "team" ? "Everyone at your restaurant sees this channel." : "Only you and the Restrolytics manager see this chat."}
          </p>
          {thread.error ? (
            <ErrorState title="This conversation didn't open" error={thread.error} onRetry={() => void thread.refetch()} />
          ) : thread.data ? (
            <ChatPane key={thread.data} threadId={thread.data} me={me} />
          ) : (
            <LoadingState rows={3} />
          )}
        </TabsContent>
        <TabsContent value="tasks">
          <TasksPanel restaurantId={ctx.data.restaurant.id} me={me} canAssign={isManager} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesPanel restaurantId={ctx.data.restaurant.id} me={me} canReview={isManager} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
