import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Headset, Loader2 } from "lucide-react";
import { useState } from "react";

import { ChatPane, ensureThread, NotesPanel, TasksPanel } from "@/components/manager/manager-panels";
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

  if (ctx.isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!ctx.data?.restaurant) return <p className="text-sm text-muted-foreground">Join a restaurant to use Restrolytics Manager.</p>;
  const me = { userId: ctx.data.userId, name: ctx.data.name, isPlatformStaff: false };
  const isManager = ctx.data.restaurant.role !== "staff";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Headset className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Restrolytics Manager</h1>
            <p className="text-sm text-muted-foreground">A real person from Restrolytics, here to help {ctx.data.restaurant.name}.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/copilot">Back to IQ</Link></Button>
          {ctx.data.isPlatformStaff ? <Button asChild><Link to="/manager-console">Open manager console</Link></Button> : null}
        </div>
      </div>
      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes for review</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant={room === "team" ? "default" : "outline"} onClick={() => setRoom("team")}>Team channel</Button>
            <Button size="sm" variant={room === "direct" ? "default" : "outline"} onClick={() => setRoom("direct")}>Private with manager</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {room === "team" ? "Everyone at your restaurant sees this channel." : "Only you and the Restrolytics manager see this chat."}
          </p>
          {thread.error ? <p className="text-sm text-destructive">{(thread.error as Error).message}</p> : null}
          {thread.data ? <ChatPane key={thread.data} threadId={thread.data} me={me} /> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </TabsContent>
        <TabsContent value="tasks">
          <TasksPanel restaurantId={ctx.data.restaurant.id} me={me} canAssign={isManager} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesPanel restaurantId={ctx.data.restaurant.id} me={me} canReview={isManager} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
