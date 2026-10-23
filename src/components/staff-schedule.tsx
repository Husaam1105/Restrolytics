import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteScheduleShift, getSchedule, saveScheduleShift } from "@/lib/schedule.functions";
import {
  PAST_RANGES,
  RANGE_LABELS,
  SHIFT_LABELS,
  UPCOMING_RANGES,
  type ScheduleRange,
} from "@/lib/schedule";
import { AREA_LABELS, addDays, formatDateRange, formatDayLabel } from "@/lib/payroll";
import { StatCard } from "@/components/stat-card";

const emptyForm = {
  employeeId: "",
  shiftDate: "",
  area: "foh" as "foh" | "boh" | "both",
  shift: "opening" as "opening" | "mid" | "closing" | "all-day",
  startTime: "",
  endTime: "",
  note: "",
};

export function StaffSchedule() {
  const queryClient = useQueryClient();
  const fetchSchedule = useServerFn(getSchedule);
  const saveShift = useServerFn(saveScheduleShift);
  const removeShift = useServerFn(deleteScheduleShift);

  const [range, setRange] = useState<ScheduleRange>("today");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-schedule", range],
    queryFn: () => fetchSchedule({ data: { range } }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });

  const save = useMutation({
    mutationFn: () =>
      saveShift({
        data: {
          employeeId: form.employeeId,
          shiftDate: form.shiftDate || (data?.today ?? ""),
          area: form.area,
          shift: form.shift,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          note: form.note || null,
        },
      }),
    onSuccess: () => {
      toast.success("Shift added");
      setForm({ ...emptyForm, shiftDate: form.shiftDate });
      setShowForm(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeShift({ data: { id } }),
    onSuccess: () => {
      toast.success("Shift removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["shifts"]>();
    for (const s of data?.shifts ?? []) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [data]);
  const byDay = [...shiftsByDate.keys()];
  const scheduledPeople = data?.shifts.length ?? 0;
  const coveredDays = byDay.length;

  const days = useMemo(() => {
    if (!data) return [] as string[];
    const out: string[] = [];
    for (let d = data.start; d <= data.end && out.length < 62; d = addDays(d, 1)) out.push(d);
    return out;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Scheduled shifts", value: scheduledPeople },
          { label: "Days covered", value: coveredDays },
          {
            label: "Front of house",
            value: (data?.shifts ?? []).filter((s) => s.area === "foh" || s.area === "both").length,
          },
          {
            label: "Kitchen",
            value: (data?.shifts ?? []).filter((s) => s.area === "boh" || s.area === "both").length,
          },
        ].map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Who&apos;s working</CardTitle>
              <CardDescription>
                {data
                  ? `${RANGE_LABELS[range]}, ${formatDateRange(data.start, data.end)}`
                  : "Loading…"}
              </CardDescription>
            </div>
            {data?.canManage ? (
              <Button
                size="sm"
                onClick={() => {
                  setForm({ ...emptyForm, shiftDate: data.today });
                  setShowForm((v) => !v);
                }}
              >
                <Plus className="mr-1 size-4" /> Add shift
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Tabs value={range} onValueChange={(v) => setRange(v as ScheduleRange)}>
              <TabsList>
                {UPCOMING_RANGES.map((r) => (
                  <TabsTrigger key={r} value={r}>
                    {RANGE_LABELS[r]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={range} onValueChange={(v) => setRange(v as ScheduleRange)}>
              <TabsList>
                {PAST_RANGES.map((r) => (
                  <TabsTrigger key={r} value={r}>
                    {RANGE_LABELS[r]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        {showForm && data?.canManage ? (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => {
                    const emp = data.employees.find((e) => e.id === v);
                    setForm((f) => ({ ...f, employeeId: v, area: emp?.area ?? f.area }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick someone" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shiftDate">Date</Label>
                <Input
                  id="shiftDate"
                  type="date"
                  value={form.shiftDate}
                  onChange={(e) => setForm((f) => ({ ...f, shiftDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select
                  value={form.shift}
                  onValueChange={(v) => setForm((f) => ({ ...f, shift: v as typeof f.shift }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SHIFT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Area</Label>
                <Select
                  value={form.area}
                  onValueChange={(v) => setForm((f) => ({ ...f, area: v as typeof f.area }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foh">Front of house</SelectItem>
                    <SelectItem value="boh">Back of house</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Starts</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime">Ends</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                value={form.note}
                placeholder="Covering the patio"
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save shift"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
            {data.employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No staff yet. Add people on the Employees page first.
              </p>
            ) : null}
          </CardContent>
        ) : null}

        <CardContent className="border-t pt-4">
          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {byDay.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">
                  Nobody is scheduled for {RANGE_LABELS[range].toLowerCase()}.
                </p>
              ) : null}
              <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                {days.map((date) => {
                  const shifts = shiftsByDate.get(date) ?? [];
                  const isToday = date === data.today;
                  return (
                    <div
                      key={date}
                      className={`flex w-64 shrink-0 snap-start flex-col rounded-lg border bg-muted/40 ${isToday ? "border-primary" : ""}`}
                    >
                      <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
                        <span className={isToday ? "text-primary" : ""}>
                          {formatDayLabel(date)}
                          {isToday ? " (today)" : ""}
                        </span>
                        <Badge variant="secondary">{shifts.length}</Badge>
                      </div>
                      <div className="flex min-h-24 flex-col gap-2 p-2">
                        {shifts.length === 0 ? (
                          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                            No one scheduled
                          </p>
                        ) : (
                          shifts.map((s) => (
                            <div key={s.id} className="surface p-3 text-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{s.name}</p>
                                  {s.position ? (
                                    <p className="truncate text-xs text-muted-foreground">
                                      {s.position}
                                    </p>
                                  ) : null}
                                </div>
                                {data.canManage ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="-mr-1 -mt-1 size-7 shrink-0"
                                    aria-label={`Remove ${s.name}`}
                                    onClick={() => remove.mutate(s.id)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge variant="secondary">{AREA_LABELS[s.area as "foh"]}</Badge>
                                <Badge variant="outline">{SHIFT_LABELS[s.shift] ?? s.shift}</Badge>
                              </div>
                              <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                                {s.startTime || s.endTime
                                  ? `${s.startTime?.slice(0, 5) ?? "—"} – ${s.endTime?.slice(0, 5) ?? "—"}`
                                  : "Time not set"}
                              </p>
                              {s.note ? (
                                <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
