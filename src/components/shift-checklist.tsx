import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Camera, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addShiftTask,
  addTaskNote,
  getShiftChecklist,
  removeShiftTask,
  setTaskCompletion,
  uploadTaskPhoto,
  type TaskArea,
  type TaskShift,
} from "@/lib/shift-tasks.functions";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That photo could not be read."));
    reader.readAsDataURL(file);
  });
}
import { formatTime } from "@/lib/operating-day";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ShiftChecklist({
  area,
  shift,
  title,
  description,
  embedded = false,
}: {
  area: TaskArea;
  shift: TaskShift;
  title: string;
  description: string;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const fetchChecklist = useServerFn(getShiftChecklist);
  const toggle = useServerFn(setTaskCompletion);
  const add = useServerFn(addShiftTask);
  const remove = useServerFn(removeShiftTask);
  const addNote = useServerFn(addTaskNote);
  const uploadPhoto = useServerFn(uploadTaskPhoto);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoTaskId, setPhotoTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newTaskInput, setNewTaskInput] = useState<"none" | "text" | "number" | "temperature">(
    "none",
  );
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const queryKey = ["shift-checklist", area, shift];

  const { data, isPending } = useQuery({
    queryKey,
    queryFn: () => fetchChecklist({ data: { area, shift } }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["shift-progress"] });
  };

  const toggleMutation = useMutation({
    mutationFn: (vars: { taskId: string; completed: boolean; value?: string | null }) =>
      toggle({ data: vars }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const addMutation = useMutation({
    mutationFn: (taskTitle: string) =>
      add({ data: { area, shift, title: taskTitle, inputType: newTaskInput } }),
    onSuccess: () => {
      setNewTask("");
      setNewTaskInput("none");
      toast.success("Task added");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (taskId: string) => remove({ data: { taskId } }),
    onSuccess: () => {
      toast.success("Task removed");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const noteMutation = useMutation({
    mutationFn: (vars: { taskId: string; note: string }) => addNote({ data: vars }),
    onSuccess: () => {
      setNoteFor(null);
      setNoteText("");
      toast.success("Comment added");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const photoMutation = useMutation({
    mutationFn: async (vars: { taskId: string; file: File }) => {
      const dataUrl = await fileToDataUrl(vars.file);
      return uploadPhoto({ data: { taskId: vars.taskId, dataUrl, fileName: vars.file.name } });
    },
    onSuccess: () => {
      toast.success("Photo added — task marked done");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tasks = data?.tasks ?? [];
  const completed = tasks.filter((t) => t.completed).length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div className={embedded ? "min-w-0 space-y-4" : "mx-auto max-w-3xl space-y-6 px-4 py-6"}>
      <div>
        <h2 className={embedded ? "text-lg font-semibold tracking-tight" : "text-2xl font-semibold tracking-tight"}>{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Today’s checklist</span>
            <span className="text-sm font-normal text-muted-foreground">
              {completed} of {tasks.length} done
            </span>
          </CardTitle>
          <CardDescription>
            {data
              ? `Business day ${data.date} · resets after closing at ${formatTime(data.settings.closeTime)} (${data.settings.timezone})`
              : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percent} />

          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          ) : (
            <ul className="divide-y">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-3 py-3">
                  <Checkbox
                    id={task.id}
                    checked={task.completed}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({
                        taskId: task.id,
                        completed: Boolean(checked),
                        value: values[task.id] ?? task.value ?? null,
                      })
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor={task.id} className="cursor-pointer">
                      <span
                        className={
                          task.completed ? "text-muted-foreground line-through" : "font-medium"
                        }
                      >
                        {task.title}
                      </span>
                      {task.details && (
                        <span className="block text-xs text-muted-foreground">{task.details}</span>
                      )}
                      {task.completed && task.completedBy && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Done by {task.completedBy}
                          {task.completedAt &&
                            ` at ${new Date(task.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                        </span>
                      )}
                    </label>

                    {task.inputType !== "none" && (
                      <form
                        className="mt-2 flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          toggleMutation.mutate({
                            taskId: task.id,
                            completed: true,
                            value: values[task.id] ?? task.value ?? "",
                          });
                        }}
                      >
                        <Input
                          value={values[task.id] ?? task.value ?? ""}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [task.id]: e.target.value }))
                          }
                          inputMode={task.inputType === "text" ? "text" : "decimal"}
                          placeholder={
                            task.inputType === "temperature"
                              ? `e.g. walk-in 38, freezer 0 (${task.inputUnit ?? "°F"})`
                              : (task.inputLabel ?? "Enter value")
                          }
                          className="h-8 max-w-xs text-xs"
                          aria-label={task.inputLabel ?? `Value for ${task.title}`}
                        />
                        <Button type="submit" size="sm" variant="secondary" className="h-8">
                          Save
                        </Button>
                      </form>
                    )}

                    {task.photoUrl && (
                      <a
                        href={task.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block"
                        aria-label={`View photo for ${task.title}`}
                      >
                        <img
                          src={task.photoUrl}
                          alt={`Proof photo for ${task.title}`}
                          className="h-16 w-16 rounded-md border object-cover"
                        />
                      </a>
                    )}

                    {task.notes.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {task.notes.map((n) => (
                          <li
                            key={n.id}
                            className="rounded-md bg-muted px-2.5 py-1.5 text-xs"
                          >
                            <span className="block">{n.note}</span>
                            <span className="text-muted-foreground">
                              {n.author ?? "Manager"} ·{" "}
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {noteFor === task.id ? (
                      <form
                        className="mt-2 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (noteText.trim())
                            noteMutation.mutate({ taskId: task.id, note: noteText });
                        }}
                      >
                        <Input
                          autoFocus
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Write a comment…"
                          className="h-8 text-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="h-8"
                          disabled={noteMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setNoteFor(null);
                            setNoteText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : null}
                  </div>
                  {shift === "closing" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Add photo for ${task.title}`}
                      disabled={photoMutation.isPending}
                      onClick={() => {
                        setPhotoTaskId(task.id);
                        photoInputRef.current?.click();
                      }}
                    >
                      {photoMutation.isPending && photoTaskId === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Comment on ${task.title}`}
                    onClick={() => {
                      setNoteFor(noteFor === task.id ? null : task.id);
                      setNoteText("");
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${task.title}`}
                    onClick={() => removeMutation.mutate(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
              {tasks.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">
                  No tasks yet — add your first one below.
                </li>
              )}
            </ul>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            aria-label="Upload task photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && photoTaskId) photoMutation.mutate({ taskId: photoTaskId, file });
              e.target.value = "";
            }}
          />

          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newTask.trim()) addMutation.mutate(newTask);
            }}
          >
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task…"
              className="min-w-40 flex-1"
            />
            <select
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value as typeof newTaskInput)}
              aria-label="Entry field"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="none">Check only</option>
              <option value="temperature">Temperature entry</option>
              <option value="number">Number entry</option>
              <option value="text">Text entry</option>
            </select>
            <Button type="submit" disabled={addMutation.isPending}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
