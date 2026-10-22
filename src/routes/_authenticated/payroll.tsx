import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildPayrollWeek,
  closePayrollWeek,
  getPayrollWeek,
  markPayoutPaid,
  savePayrollSettings,
  saveHours,
  saveTipPool,
  updatePayrollLine,
} from "@/lib/payroll.functions";
import {
  PAY_METHOD_LABELS,
  POOL_AREA_LABELS,
  WEEKDAY_LABELS,
  addDays,
  formatDateRange,
  formatDayLabel,
  hoursLabel,
  minutesToHours,
  money,
  type PoolArea,
} from "@/lib/payroll";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
  head: () => ({
    meta: [
      { title: "Payroll — Restaurant CRM" },
      {
        name: "description",
        content: "Weekly hours, tip splits and cash payouts for front and back of house.",
      },
      { property: "og:title", content: "Payroll — Restaurant CRM" },
      {
        property: "og:description",
        content: "Weekly hours, tip splits and cash payouts for front and back of house.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PayrollPage() {
  const queryClient = useQueryClient();
  const fetchWeek = useServerFn(getPayrollWeek);
  const setHours = useServerFn(saveHours);
  const setPool = useServerFn(saveTipPool);
  const build = useServerFn(buildPayrollWeek);
  const updateLine = useServerFn(updatePayrollLine);
  const markPaid = useServerFn(markPayoutPaid);
  const closeWeek = useServerFn(closePayrollWeek);
  const saveSettings = useServerFn(savePayrollSettings);

  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [rangeChoice, setRangeChoice] = useState("this-week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [poolArea, setPoolArea] = useState<PoolArea>("all");

  const { data, isError, error } = useQuery({
    queryKey: ["payroll-week", weekStart, range?.start, range?.end],
    queryFn: () => fetchWeek({ data: { weekStart, rangeStart: range?.start ?? null, rangeEnd: range?.end ?? null } }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["payroll-week"] });

  const hoursMutation = useMutation({
    mutationFn: (input: { employeeId: string; workDate: string; hours: number }) =>
      setHours({ data: input }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const poolMutation = useMutation({
    mutationFn: (input: { poolDate: string; area: PoolArea; amount: number }) =>
      setPool({ data: input }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const buildMutation = useMutation({
    mutationFn: () => {
      if (!data) throw new Error("The pay week is still loading.");
      return build({ data: { weekStart: data.weekStart } });
    },
    onSuccess: (result) => {
      toast.success(`Pay sheet ready for ${result.people} people`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lineMutation = useMutation({
    mutationFn: (input: { lineId: string; adjustments: number }) => updateLine({ data: input }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const paidMutation = useMutation({
    mutationFn: (input: { lineId: string; paid: boolean }) => markPaid({ data: input }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: (input: { periodId: string; status: "draft" | "paid" }) => closeWeek({ data: input }),
    onSuccess: () => {
      toast.success("Pay week updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const weekStartMutation = useMutation({
    mutationFn: (value: number) => saveSettings({ data: { weekStartsOn: value } }),
    onSuccess: () => {
      toast.success("Week start saved");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">Payroll</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Only owners and managers can open payroll."}
        </p>
      </div>
    );
  }

  const days = data?.days ?? [];
  const active = (data?.employees ?? []).filter((e) => e.active);
  const foh = active.filter((e) => e.area !== "boh");
  const boh = active.filter((e) => e.area !== "foh");
  const poolFor = (date: string) =>
    data?.pools.find((p) => p.poolDate === date && p.area === poolArea)?.amount ?? 0;

  const lines = data?.lines ?? [];
  const nameOf = (employeeId: string) =>
    data?.employees.find((e) => e.id === employeeId)?.fullName ?? "Employee";
  const cashTotal = lines
    .filter((l) => l.payMethod === "cash")
    .reduce((sum, l) => sum + l.total, 0);
  const payTotal = lines.reduce((sum, l) => sum + l.total, 0);
  const unpaidTotal = lines.filter((l) => !l.paid).reduce((sum, l) => sum + l.total, 0);
  const paidTotal = lines.filter((l) => l.paid).reduce((sum, l) => sum + l.total, 0);
  const totalHours = active.reduce((sum, person) => sum + person.hours, 0);
  const payrollReady = lines.length > 0;
  const chooseRange = (value: string) => {
    setRangeChoice(value);
    if (!data) return;
    if (value === "this-week") {
      setRange(null);
      setWeekStart(null);
    } else if (value === "last-week") {
      setRange(null);
      setWeekStart(addDays(data.weekStart, -7));
    } else if (value === "last-month") {
      const anchor = new Date(`${data.weekEnd}T00:00:00Z`);
      const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 0));
      setWeekStart(null);
      setRange({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
    }
  };

  const hoursGrid = (rows: typeof foh, title: string) => (
    <Card className="overflow-hidden rounded-lg shadow-xs">
      <CardHeader>
        <CardTitle>{title} hours</CardTitle>
        <CardDescription>
          Type hours to correct a day. Clocked time fills in automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Name</TableHead>
                {days.map((day) => (
                  <TableHead key={day} className="text-center">
                    {formatDayLabel(day)}
                  </TableHead>
                ))}
                <TableHead className="text-right">Week</TableHead>
                <TableHead className="text-right">Tips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground">
                    No active employees here yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">
                      {person.fullName}
                      <div className="text-xs text-muted-foreground">
                        {money(person.hourlyRate)}/hr · {PAY_METHOD_LABELS[person.payMethod]}
                      </div>
                    </TableCell>
                    {days.map((day, index) => (
                      <TableCell key={day} className="p-1 text-center">
                        <Input
                          className="mx-auto h-9 w-16 text-center"
                          inputMode="decimal"
                          defaultValue={
                            person.minutesByDay[index]
                              ? String(minutesToHours(person.minutesByDay[index]!))
                              : ""
                          }
                          key={`${person.id}-${day}-${person.minutesByDay[index]}`}
                          placeholder="0"
                          onBlur={(event) => {
                            const value = Number(event.target.value) || 0;
                            const current = minutesToHours(person.minutesByDay[index] ?? 0);
                            if (value === current) return;
                            hoursMutation.mutate({
                              employeeId: person.id,
                              workDate: day,
                              hours: value,
                            });
                          }}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium">
                      {hoursLabel(person.hours)}
                    </TableCell>
                    <TableCell className="text-right">{money(person.tipShare)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">People & pay</p>
          <h1 className="truncate text-3xl font-bold">{data?.isCombined ? "Payroll report" : "Weekly payroll"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data
              ? `${data.isCombined ? "Combined report" : "Pay week"} ${formatDateRange(data.weekStart, data.weekEnd)}`
              : "Loading pay week…"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select value={rangeChoice} onValueChange={chooseRange}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Payroll date range">
              <CalendarDays className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="last-week">Last week</SelectItem>
              <SelectItem value="last-month">Last month</SelectItem>
              <SelectItem value="custom">Custom dates</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {rangeChoice === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-xs">
          <div className="space-y-1.5">
            <Label htmlFor="payroll-range-start">Start date</Label>
            <Input id="payroll-range-start" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payroll-range-end">End date</Label>
            <Input id="payroll-range-end" type="date" min={customStart || undefined} value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
          </div>
          <Button
            disabled={!customStart || !customEnd || customEnd < customStart}
            onClick={() => {
              if (!customStart || !customEnd || customEnd < customStart) return;
              setWeekStart(null);
              setRange({ start: customStart, end: customEnd });
            }}
          >Apply dates</Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PayrollMetric icon={Users} label="Employees" value={String(active.length)} detail={`${lines.length} on pay sheet`} />
        <PayrollMetric icon={Clock3} label="Hours recorded" value={hoursLabel(totalHours)} detail="FOH + BOH" />
        <PayrollMetric icon={CircleDollarSign} label="Payroll total" value={money(payTotal)} detail={`${money(paidTotal)} paid`} />
        <PayrollMetric icon={Banknote} label="Cash required" value={money(cashTotal)} detail={`${money(unpaidTotal)} still due`} alert={unpaidTotal > 0} />
      </div>

      {!data?.isCombined && <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><Badge variant={data?.period?.status === "paid" ? "default" : "secondary"}>{data?.period?.status === "paid" ? "Week closed" : payrollReady ? "Draft pay sheet" : "Hours in progress"}</Badge><span className="text-xs text-muted-foreground">Hours → tips → review → payout</span></div>
          <p className="mt-2 text-sm text-muted-foreground">Review each employee, record any advance or reimbursement as an adjustment, then mark their cash or Zelle payout paid.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={() => buildMutation.mutate()} disabled={!data || buildMutation.isPending}><Calculator className="mr-2 size-4" />{payrollReady ? "Recalculate" : "Build pay sheet"}</Button>
        </div>
      </div>}

      {!data?.isCombined && <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Week starts on</Label>
          <Select
            value={String(data?.weekStartsOn ?? 1)}
            onValueChange={(value) => weekStartMutation.mutate(Number(value))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>}

      {!data?.isCombined && hoursGrid(foh, "Front of house")}
      {!data?.isCombined && hoursGrid(boh, "Back of house")}

      {!data?.isCombined && <Card className="overflow-hidden rounded-lg shadow-xs">
        <CardHeader>
          <CardTitle>Tip pool</CardTitle>
          <CardDescription>
            Enter what came in each day. It splits across everyone who worked that day, in proportion
            to their hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Shared with</Label>
            <Select value={poolArea} onValueChange={(value) => setPoolArea(value as PoolArea)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{POOL_AREA_LABELS.all}</SelectItem>
                <SelectItem value="foh">{POOL_AREA_LABELS.foh}</SelectItem>
                <SelectItem value="boh">{POOL_AREA_LABELS.boh}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((day) => (
              <div key={day} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{formatDayLabel(day)}</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  key={`${day}-${poolArea}-${poolFor(day)}`}
                  defaultValue={poolFor(day) ? String(poolFor(day)) : ""}
                  onBlur={(event) => {
                    const value = Number(event.target.value) || 0;
                    if (value === poolFor(day)) return;
                    poolMutation.mutate({ poolDate: day, area: poolArea, amount: value });
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>}

      <Card className="overflow-hidden rounded-lg shadow-xs">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Pay sheet</CardTitle>
            <CardDescription>
              {data?.isCombined
                ? `${data.periodCount} weekly pay sheets combined into one employee report.`
                : data?.period
                ? data.period.status === "paid"
                  ? "This week is closed as paid."
                  : "Draft — rebuild any time after changing hours or tips."
                : "Not built yet for this week."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data?.period && !data.isCombined && (
              <Button
                variant="outline"
                onClick={() => {
                  if (!data.period) return;
                  closeMutation.mutate({ periodId: data.period.id, status: data.period.status === "paid" ? "draft" : "paid" });
                }}
              >
                {data.period.status === "paid" ? "Reopen week" : "Close week as paid"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Wages</TableHead>
                  <TableHead className="text-right">Tips</TableHead>
                  <TableHead className="text-right">Adjustment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Paid by</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      Build the pay sheet to see everyone&apos;s pay for this week.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{nameOf(line.employeeId)}</TableCell>
                      <TableCell className="text-right">{hoursLabel(line.hours)}</TableCell>
                      <TableCell className="text-right">{money(line.hourlyRate)}</TableCell>
                      <TableCell className="text-right">{money(line.wages)}</TableCell>
                      <TableCell className="text-right">{money(line.tips)}</TableCell>
                      <TableCell className="p-1 text-right">
                          {data?.isCombined ? money(line.adjustments) : <Input
                          className="ml-auto h-9 w-20 text-right"
                          inputMode="decimal"
                          key={`${line.id}-${line.adjustments}`}
                          defaultValue={line.adjustments ? String(line.adjustments) : ""}
                          placeholder="0"
                          onBlur={(event) => {
                            const value = Number(event.target.value) || 0;
                            if (value === line.adjustments) return;
                            lineMutation.mutate({ lineId: line.id, adjustments: value });
                          }}
                          />}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {money(line.total)}
                      </TableCell>
                      <TableCell>{PAY_METHOD_LABELS[line.payMethod]}</TableCell>
                      <TableCell className="text-right">
                        {data?.isCombined ? (
                          <Badge variant={line.paid ? "default" : "secondary"}>{line.paid ? "All paid" : "Payment due"}</Badge>
                        ) : line.paid ? (
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant={line.acknowledgedAt ? "default" : "secondary"}>
                              {line.acknowledgedAt ? "Confirmed" : "Paid"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => paidMutation.mutate({ lineId: line.id, paid: false })}
                            >
                              Undo
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => paidMutation.mutate({ lineId: line.id, paid: true })}
                          >
                            <Banknote className="mr-2 h-4 w-4" />
                            Mark paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {lines.length > 0 && <div className="rounded-lg border bg-primary p-5 text-primary-foreground shadow-sm"><div className="grid gap-4 sm:grid-cols-3"><SummaryTile label="Week total" value={money(payTotal)} /><SummaryTile label="Cash to hand out" value={money(cashTotal)} /><SummaryTile label="Still unpaid" value={money(unpaidTotal)} /></div></div>}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div><div className="text-xs font-medium text-primary-foreground/70">{label}</div><div className="mt-1 font-mono text-2xl font-bold">{value}</div></div>
  );
}

function PayrollMetric({ icon: Icon, label, value, detail, alert = false }: { icon: typeof Users; label: string; value: string; detail: string; alert?: boolean }) {
  return <div className="rounded-lg border bg-card p-4 shadow-xs"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p>{alert ? <AlertTriangle className="size-4 text-warning" /> : <Icon className="size-4 text-muted-foreground" />}</div><p className="mt-2 font-mono text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
