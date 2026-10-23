import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePrompt } from "@/components/confirm-dialog";

export type Me = { userId: string; name: string; isPlatformStaff: boolean };

function useRealtime(table: string, filter: string, key: unknown[]) {
  const qc = useQueryClient();
  const k = JSON.stringify(key);
  useEffect(() => {
    const ch = supabase
      .channel(`${table}-${filter}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => qc.invalidateQueries({ queryKey: JSON.parse(k) }))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [table, filter, k, qc]);
}

/** Finds or creates the team channel / a member's private thread. */
export async function ensureThread(restaurantId: string, kind: "team" | "direct", member?: { id: string; name: string }) {
  const q = supabase.from("manager_threads").select("id").eq("restaurant_id", restaurantId).eq("kind", kind);
  const find = () => (kind === "direct" ? q.eq("member_user_id", member!.id) : q).maybeSingle();
  const { data } = await find();
  if (data) return data.id;
  const { data: created, error } = await supabase
    .from("manager_threads")
    .insert({ restaurant_id: restaurantId, kind, member_user_id: member?.id ?? null, member_name: member?.name ?? null })
    .select("id")
    .single();
  if (created) return created.id;
  const { data: again } = await supabase
    .from("manager_threads")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("kind", kind)
    .match(kind === "direct" ? { member_user_id: member!.id } : {})
    .maybeSingle();
  if (again) return again.id;
  throw new Error(error?.message ?? "Couldn't open this chat");
}

export function ChatPane({ threadId, me, draft, onDraftUsed }: { threadId: string; me: Me; draft?: string | undefined; onDraftUsed?: () => void }) {
  const key = ["mgr-messages", threadId];
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useRealtime("manager_messages", `thread_id=eq.${threadId}`, key);
  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manager_messages")
        .select("id, author_id, author_name, from_manager, body, created_at")
        .eq("thread_id", threadId)
        .order("created_at")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [data.length]);
  useEffect(() => {
    if (draft) {
      setText(draft);
      onDraftUsed?.();
      inputRef.current?.focus();
    }
  }, [draft, onDraftUsed]);
  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("manager_messages")
        .insert({ thread_id: threadId, author_id: me.userId, author_name: me.isPlatformStaff ? "Restrolytics Manager" : me.name, from_manager: me.isPlatformStaff, body });
      if (error) throw error;
      await supabase.from("manager_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: key });
      inputRef.current?.focus();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const submit = () => {
    const body = text.trim();
    if (body && !send.isPending) send.mutate(body);
  };
  return (
    <div className="flex h-[calc(100dvh-20rem)] min-h-[380px] flex-col rounded-lg border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
        {!isLoading && data.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p> : null}
        {data.map((m) => {
          const mine = m.author_id === me.userId;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <span className="mb-1 text-xs text-muted-foreground">
                {m.author_name ?? "Someone"}
                {m.from_manager ? ", Restrolytics manager" : ""}, {new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : m.from_manager ? "bg-accent text-accent-foreground" : "bg-muted",
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          ref={inputRef}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message…"
          className="min-h-[44px] resize-none"
          rows={1}
        />
        <Button size="icon" onClick={submit} disabled={!text.trim() || send.isPending} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export type Member = { user_id: string; name: string };

export function useMembers(restaurantId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["mgr-members", restaurantId],
    enabled,
    queryFn: async (): Promise<Member[]> => {
      const [{ data: members }, { data: emps }] = await Promise.all([
        supabase.from("restaurant_members").select("user_id, email").eq("restaurant_id", restaurantId),
        supabase.from("employees").select("user_id, full_name").eq("restaurant_id", restaurantId),
      ]);
      return (members ?? []).map((m) => ({
        user_id: m.user_id,
        name: emps?.find((e) => e.user_id === m.user_id)?.full_name ?? m.email?.split("@")[0] ?? "Member",
      }));
    },
  });
}

export function TasksPanel({ restaurantId, me, canAssign }: { restaurantId: string; me: Me; canAssign: boolean }) {
  const key = ["mgr-tasks", restaurantId];
  const qc = useQueryClient();
  useRealtime("manager_tasks", `restaurant_id=eq.${restaurantId}`, key);
  const members = useMembers(restaurantId, canAssign);
  const [form, setForm] = useState({ title: "", details: "", due: "", assignee: "anyone" });
  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manager_tasks")
        .select("id, title, details, due_date, status, assigned_to, assigned_name, completion_note, completed_at")
        .eq("restaurant_id", restaurantId)
        .order("status")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: async () => {
      const who = members.data?.find((m) => m.user_id === form.assignee);
      const { error } = await supabase.from("manager_tasks").insert({
        restaurant_id: restaurantId,
        title: form.title.trim(),
        details: form.details.trim() || null,
        due_date: form.due || null,
        assigned_to: who?.user_id ?? null,
        assigned_name: who?.name ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ title: "", details: "", due: "", assignee: "anyone" });
      refresh();
      toast.success("Task assigned");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const prompt = usePrompt();
  const completeTask = async (t: { id: string; status: string }) => {
    let note: string | null = null;
    if (t.status === "open") {
      note = await prompt({
        title: "Mark task done",
        label: "Note for the manager (optional)",
        placeholder: "What was done, or anything they should know",
        confirmLabel: "Mark done",
      });
      if (note === null) return;
    }
    toggle.mutate({ ...t, note: note || null });
  };
  const toggle = useMutation({
    mutationFn: async (t: { id: string; status: string; note: string | null }) => {
      const note = t.note;
      const done = t.status === "open";
      const { error } = await supabase
        .from("manager_tasks")
        .update({ status: done ? "done" : "open", completed_at: done ? new Date().toISOString() : null, completion_note: done ? note : null })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e) => toast.error((e as Error).message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manager_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      {canAssign ? (
        <div className="grid gap-2 rounded-lg border bg-card p-4 md:grid-cols-[1fr_180px_160px_auto]">
          <Input placeholder="New task, e.g. Deep clean fryer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select value={form.assignee} onValueChange={(v) => setForm({ ...form, assignee: v })}>
            <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="anyone">Anyone on the team</SelectItem>
              {(members.data ?? []).map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} aria-label="Due date" />
          <Button onClick={() => create.mutate()} disabled={!form.title.trim() || create.isPending}>Assign</Button>
          <Textarea className="md:col-span-4" placeholder="Details (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={2} />
        </div>
      ) : null}
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
      {!isLoading && data.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : null}
      <div className="space-y-2">
        {data.map((t) => {
          const overdue = t.status === "open" && t.due_date && t.due_date < today;
          return (
            <div key={t.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
              <button type="button" onClick={() => void completeTask(t)} aria-label={t.status === "open" ? "Mark done" : "Reopen"} className="mt-0.5">
                {t.status === "done" ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</p>
                {t.details ? <p className="text-sm text-muted-foreground">{t.details}</p> : null}
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{t.assigned_name ?? "Anyone"}</span>
                  {t.due_date ? <Badge variant={overdue ? "destructive" : "secondary"}>Due {t.due_date}</Badge> : null}
                  {t.completion_note ? <span>Note: {t.completion_note}</span> : null}
                </div>
              </div>
              {canAssign ? (
                <button type="button" aria-label="Delete task" onClick={() => remove.mutate(t.id)} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {!canAssign && me ? null : null}
    </div>
  );
}

const CATEGORIES = ["general", "incident", "maintenance", "customer", "inventory", "staff"];

export function NotesPanel({ restaurantId, me, canReview }: { restaurantId: string; me: Me; canReview: boolean }) {
  const key = ["mgr-notes", restaurantId];
  const qc = useQueryClient();
  useRealtime("manager_notes", `restaurant_id=eq.${restaurantId}`, key);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manager_notes")
        .select("id, author_id, author_name, category, body, status, review_note, reviewed_at, created_at")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("manager_notes")
        .insert({ restaurant_id: restaurantId, author_id: me.userId, author_name: me.name, category, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      refresh();
      toast.success("Note sent for review");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const prompt = usePrompt();
  const reviewNote = async (n: { id: string; status: "reviewed" | "resolved" }) => {
    const note = await prompt({
      title: n.status === "resolved" ? "Resolve note" : "Mark note reviewed",
      label: "Reply to the author (optional)",
      confirmLabel: n.status === "resolved" ? "Resolve" : "Mark reviewed",
    });
    if (note === null) return;
    review.mutate({ ...n, note: note || null });
  };
  const review = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: "reviewed" | "resolved"; note: string | null }) => {
      const { error } = await supabase
        .from("manager_notes")
        .update({ status, review_note: note, reviewed_by: me.userId, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-4">
      {!me.isPlatformStaff ? (
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="What happened? e.g. Walk-in door not sealing, customer complaint at table 4…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          <Button onClick={() => add.mutate()} disabled={!body.trim() || add.isPending}>Log note for review</Button>
        </div>
      ) : null}
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
      {!isLoading && data.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : null}
      <div className="space-y-2">
        {data.map((n) => (
          <div key={n.id} className="rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="capitalize">{n.category}</Badge>
              <Badge variant={n.status === "open" ? "default" : "secondary"} className="capitalize">{n.status}</Badge>
              <span>{n.author_name ?? "Team member"}, {new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
            {n.review_note ? <p className="mt-2 text-sm text-muted-foreground">Manager: {n.review_note}</p> : null}
            {canReview && n.status !== "resolved" ? (
              <div className="mt-2 flex gap-2">
                {n.status === "open" ? (
                  <Button size="sm" variant="outline" onClick={() => void reviewNote({ id: n.id, status: "reviewed" })}>Mark reviewed</Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => void reviewNote({ id: n.id, status: "resolved" })}>Resolve</Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
