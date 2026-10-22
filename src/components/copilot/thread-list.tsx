import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createCopilotThread, deleteCopilotThread, listCopilotThreads } from "@/lib/copilot.functions";
import { cn } from "@/lib/utils";

export function useNewThread() {
  const create = useServerFn(createCopilotThread);
  const navigate = useNavigate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (q?: string) => create().then((t) => ({ id: t.id, q })),
    onSuccess: ({ id, q }) => {
      qc.invalidateQueries({ queryKey: ["copilot-threads"] });
      navigate({ to: "/copilot/$threadId", params: { threadId: id }, search: q ? { q } : {} });
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function ThreadList({ activeId }: { activeId?: string }) {
  const list = useServerFn(listCopilotThreads);
  const del = useServerFn(deleteCopilotThread);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const newThread = useNewThread();
  const { data = [] } = useQuery({ queryKey: ["copilot-threads"], queryFn: () => list() });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["copilot-threads"] });
      if (id === activeId) navigate({ to: "/copilot" });
    },
  });
  return (
    <div className="flex flex-col gap-2">
      <Button onClick={() => newThread.mutate(undefined)} disabled={newThread.isPending} className="w-full justify-start">
        <MessageSquarePlus className="mr-2 h-4 w-4" /> New chat
      </Button>
      <div className="flex flex-col gap-1">
        {data.length === 0 ? <p className="px-2 py-1 text-sm text-muted-foreground">No chats yet.</p> : null}
        {data.map((t) => (
          <div
            key={t.id}
            className={cn(
              "group flex items-center gap-1 rounded-md pr-1 text-sm hover:bg-muted",
              t.id === activeId && "bg-muted font-medium",
            )}
          >
            <Link to="/copilot/$threadId" params={{ threadId: t.id }} className="min-w-0 flex-1 truncate px-2 py-2">
              {t.title}
            </Link>
            <button
              type="button"
              aria-label="Delete chat"
              onClick={() => remove.mutate(t.id)}
              className="rounded p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
