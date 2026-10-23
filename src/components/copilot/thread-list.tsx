import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  createCopilotThread,
  deleteCopilotThread,
  listCopilotThreads,
} from "@/lib/copilot.functions";
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

export function ThreadList({
  activeId,
  onNavigate,
}: {
  activeId?: string;
  onNavigate?: () => void;
}) {
  const list = useServerFn(listCopilotThreads);
  const del = useServerFn(deleteCopilotThread);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const newThread = useNewThread();
  const {
    data = [],
    isError,
    refetch,
  } = useQuery({ queryKey: ["copilot-threads"], queryFn: () => list() });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["copilot-threads"] });
      toast.success("Chat deleted");
      if (id === activeId) navigate({ to: "/copilot" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteThread = async (id: string, title: string) => {
    const ok = await confirm({
      title: `Delete "${title}"?`,
      description: "The whole conversation is removed. This can't be undone.",
      confirmLabel: "Delete chat",
      destructive: true,
    });
    if (ok) remove.mutate(id);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={() => newThread.mutate(undefined)}
        disabled={newThread.isPending}
        className="w-full justify-start"
      >
        <MessageSquarePlus />
        New chat
      </Button>
      <nav aria-label="Your chats" className="flex flex-col gap-0.5">
        {isError ? (
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-2 py-1 text-left text-sm text-destructive underline-offset-4 hover:underline"
          >
            Chats didn&apos;t load. Try again
          </button>
        ) : data.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted-foreground">No chats yet.</p>
        ) : null}
        {data.map((t) => (
          <div
            key={t.id}
            className={cn(
              "group flex min-h-10 items-center gap-1 rounded-lg pr-1 text-sm transition-colors hover:bg-muted",
              t.id === activeId && "bg-accent font-semibold text-accent-foreground",
            )}
          >
            <Link
              to="/copilot/$threadId"
              params={{ threadId: t.id }}
              onClick={onNavigate}
              aria-current={t.id === activeId ? "page" : undefined}
              className="min-w-0 flex-1 truncate px-2.5 py-2"
            >
              {t.title}
            </Link>
            {/* Always visible on touch screens; revealed on hover/focus with a mouse. */}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete chat "${t.title}"`}
              onClick={() => void deleteThread(t.id, t.title)}
              className="text-muted-foreground opacity-100 hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </nav>
    </div>
  );
}
