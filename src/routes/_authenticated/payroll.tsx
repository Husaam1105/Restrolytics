import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Calculator, CalendarDays, CircleDollarSign, Clock3, Lock, Users } from "lucide-react";

import { useConfirm } from "@/components/confirm-dialog";
import { PageContainer, PageHeader, SectionHeader } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rangeDates } from "@/lib/date-ranges";
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
  weekStartDate,
  type PoolArea,
} from "@/lib/payroll";
import { requireManagerRoute, useRestaurantClock } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/payroll")({
  beforeLoad: requireManagerRoute,
  component: PayrollPage,
  head: () => ({
    meta: [
      { title: "Payroll · Restrolytics" },
      { name: "description", content: "Weekly hours, tip splits and payouts for front and back of house." },
    ],
  }),
});

type RangeChoice = "this-week" | "last-week" | "last-month" | "custom";
type WeekData = Awaited<ReturnType<typeof getPayrollWeek>>;
type Person = WeekData["employees"][number];

/** "" means zero; anything else must be a number in range, or we say so. */
function parseAmount(raw: string, { min, max, label }: { min: number; max: number; label: string }) {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < min || value > max) {
    toast.error(`${label} must be a number between ${min} and ${max}.`);
    return null;
  }
  return value;
}

function PayrollPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const clock = useRestaurantClock();
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
  const [rangeChoice, setRangeChoice] = useState<RangeChoice>("this-week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [poolArea, setPoolArea] = useState<PoolArea>("all");

  const query = useQuery({
    queryKey: ["payroll-week", weekStart, range?.start, range?.end],
    queryFn: () => fetchWeek({ data: { weekStart, rangeStart: range?.start ?? null, rangeEnd: range?.end ?? null } }),
  });
  const data = query.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["payroll-week"] });
  const onError = (e: Error) => toast.error(e.message);

  const hoursMutation = useMutation({
    mutationFn: (input: { employeeId: string; workDate: string; hours: number }) => setHours({ data: input }),
    onSuccess: refresh,
    onError,
  });
  const poolMutation = useMutation({
    mutationFn: (input: { poolDate: string; area: PoolArea; amount: number }) => setPool({ data: input }),
    onSuccess: refresh,
    onError,
  });
  const buildMutation = useMutation({
    mutationFn: (start: string) => build({ data: { weekStart: start } }),
    onSuccess: (result) => {
      toast.success(`Pay sheet ready for ${result.people} ${result.people === 1 ? "person" : "people"}`);
      refresh();
    },
    onError,
  });
  const lineMutation = useMutation({
    mutationFn: (input: { lineId: string; adjustments: number }) => updateLine({ data: input }),
    onSuccess: refresh,
    onError,
  });
  const paidMutation = useMutation({
    mutationFn: (input: { lineId: string; paid: boolean }) => markPaid({ data: input }),
    onSuccess: refresh,
    onError,
  });
  const closeMutation = useMutation({
    mutationFn: (input: { periodId: string; status: "draft" | "paid" }) => closeWeek({ data: input }),
    onSuccess: (_r, input) => {
      toast.success(input.status === "paid" ? "Week closed" : "Week reopened");
      refresh();
    },
    onError,
  });
  const weekStartMutation = useMutation({
    mutationFn: (value: number) => saveSettings({ data: { weekStartsOn: value } }),
    onSuccess: () => {
      toast.success("Pay week start saved");
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      refresh();
    },
    onError,
  });

  // Presets come from the restaurant's own today and pay-week start, never
  // from whatever range happens to be on screen, so they can't drift.
  const chooseRange = (value: RangeChoice) => {
    setRangeChoice(value);
    if (value === "this-week") {
      setRange(null);
      setWeekStart(null);
    } else if (value === "last-week") {
      setRange(null);
      setWeekStart(addDays(weekStartDate(clock.today, clock.weekStartsOn), -7));
    } else if (value === "last-month") {
      const { from, to } = rangeDates("last_month", clock.today, clock.weekStartsOn);
      setWeekStart(null);
      setRange({ start: from, end: to });
    }
  };

  const header = (
    <PageHeader
      context="People and pay"
      title={data?.isCombined ? "Payroll report" : "Payroll"}
      description={
        data
          ? `${data.isCombined ? "Combined report" : "Pay week"}, ${formatDateRange(data.weekStart, data.weekEnd)}`
          : "Loading the pay week…"
      }
      actions={
        <Select value={rangeChoice} onValueChange={(v) => chooseRange(v as RangeChoice)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Pay period">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-week">This week</SelectItem>
            <SelectItem value="last-week">Last week</SelectItem>
            <SelectItem value="last-month">Last month</SelectItem>
            <SelectItem value="custom">Custom dates</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  );

  if (query.isError) {
    return (
      <PageContainer>
        {header}
        <ErrorState title="Payroll didn't load" error={query.error} onRetry={() => void query.refetch()} />
      </PageContainer>
    );
  }
  if (!data) {
    return (
      <PageContainer>
        {header}
        <LoadingState rows={5} />
      </PageContainer>
    );
  }

  const locked = !data.isCombined && data.period?.status === "paid";
  const days = data.days;
  const active = data.employees.filter((e) => e.active);
  const foh = active.filter((e) => e.area !== "boh");
  const boh = active.filter((e) => e.area !== "foh");
  const poolFor = (date: string) => data.pools.find((p) => p.poolDate === date && p.area === poolArea)?.amount ?? 0;
  const lines = data.lines;
  const nameOf = (id: string) => data.employees.find((e) => e.id === id)?.fullName ?? "Employee";
  const payTotal = lines.reduce((s, l) => s + l.total, 0);
  const cashTotal = lines.filter((l) => l.payMethod === "cash").reduce((s, l) => s + l.total, 0);
  const unpaid = lines.filter((l) => !l.paid);
  const unpaidTotal = unpaid.reduce((s, l) => s + l.total, 0);
  const paidTotal = payTotal - unpaidTotal;
  const totalHours = active.reduce((s, p) => s + p.hours, 0);

  const enterHours = (person: Person, index: number, raw: string, reset: () => void) => {
    const value = parseAmount(raw, { min: 0, max: 24, label: "Hours" });
    if (value === null) return reset();
    if (value === minutesToHours(person.minutesByDay[index] ?? 0)) return;
    hoursMutation.mutate({ employeeId: person.id, workDate: days[index]!, hours: value });
  };

  const toggleWeek = async () => {
    if (!data.period) return;
    if (data.period.status === "paid") {
      const ok = await confirm({
        title: "Reopen this pay week?",
        description: "Hours, tips, adjustments and payouts become editable again. Staff who confirmed their pay keep that record.",
        confirmLabel: "Reopen week",
      });
      if (ok) closeMutation.mutate({ periodId: data.period.id, status: "draft" });
      return;
    }
    const ok = await confirm({
      title: "Close this week as paid?",
      description:
        unpaid.length > 0
          ? `${unpaid.length} payout${unpaid.length === 1 ? " is" : "s are"} still not marked paid (${money(unpaidTotal)}). Closing locks hours, tips and payouts for the week.`
          : "Closing locks hours, tips and payouts for the week. You can reopen it later.",
      confirmLabel: "Close week",
    });
    if (ok) closeMutation.mutate({ periodId: data.period.id, status: "paid" });
  };

  const undoPayout = async (lineId: string, who: string) => {
    const ok = await confirm({
      title: `Undo ${who}'s payout?`,
      description: "It goes back to unpaid, and their confirmation is cleared.",
      confirmLabel: "Undo payout",
      destructive: true,
    });
    if (ok) paidMutation.mutate({ lineId, paid: false });
  };

  return (
    <PageContainer>
      {header}

      {rangeChoice === "custom" ? (
        <form
          className="surface flex flex-wrap items-end gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (customStart && customEnd && customEnd >= customStart) {
              setWeekStart(null);
              setRange({ start: customStart, end: customEnd });
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="payroll-range-start">From</Label>
            <Input id="payroll-range-start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payroll-range-end">To</Label>
            <Input id="payroll-range-end" type="date" min={customStart || undefined} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
          <Button type="submit" disabled={!customStart || !customEnd || customEnd < customStart}>
            Show report
          </Button>
        </form>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={active.length} icon={<Users />} note={`${lines.length} on the pay sheet`} />
        <StatCard label="Hours recorded" value={hoursLabel(totalHours)} icon={<Clock3 />} note="Front and kitchen" />
        <StatCard label="Payroll total" value={money(payTotal)} icon={<CircleDollarSign />} note={`${money(paidTotal)} paid so far`} />
        <StatCard
          label="Cash to hand out"
          value={money(cashTotal)}
          icon={<Banknote />}
          tone={unpaidTotal > 0 ? "warning" : "positive"}
          note={unpaidTotal > 0 ? `${money(unpaidTotal)} still due` : "Everyone is paid"}
        />
      </div>

      {data.isCombined && data.partialPeriods > 0 ? (
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm">
          {data.partialPeriods} pay week{data.partialPeriods === 1 ? "" : "s"} only partly fall inside these dates and{" "}
          {data.partialPeriods === 1 ? "isn't" : "aren't"} included. Widen the dates to include whole weeks.
        </p>
      ) : null}

      {!data.isCombined ? (
        <section className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {locked ? (
                <Badge variant="success">
                  <Lock aria-hidden="true" />
                  Week closed
                </Badge>
              ) : (
                <Badge variant="secondary">{lines.length > 0 ? "Draft pay sheet" : "Hours in progress"}</Badge>
              )}
              <span className="text-sm text-muted-foreground">Hours, then tips, then build, then pay out.</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {locked
                ? "This week is locked. Reopen it to change hours, tips, adjustments or payouts."
                : "Record advances or reimbursements as adjustments, then mark each payout paid when it's handed over."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="week-start" className="text-sm text-muted-foreground">
                Weeks start
              </Label>
              <Select value={String(data.weekStartsOn)} onValueChange={(v) => weekStartMutation.mutate(Number(v))}>
                <SelectTrigger id="week-start" className="w-28">
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
            <Button onClick={() => buildMutation.mutate(data.weekStart)} disabled={locked || buildMutation.isPending}>
              <Calculator />
              {lines.length > 0 ? "Rebuild pay sheet" : "Build pay sheet"}
            </Button>
          </div>
        </section>
      ) : null}

      {!data.isCombined ? (
        <>
          <HoursGrid title="Front of house" rows={foh} days={days} locked={locked} onEnter={enterHours} />
          <HoursGrid title="Kitchen" rows={boh} days={days} locked={locked} onEnter={enterHours} />

          <section className="surface space-y-4 p-5 sm:p-6" aria-labelledby="tips-heading">
            <SectionHeader
              title={<span id="tips-heading">Tip pool</span>}
              description="Enter what came in each day. It splits across everyone who worked that day, by hours."
              actions={
                <Select value={poolArea} onValueChange={(v) => setPoolArea(v as PoolArea)}>
                  <SelectTrigger className="w-48" aria-label="Who shares these tips">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{POOL_AREA_LABELS.all}</SelectItem>
                    <SelectItem value="foh">{POOL_AREA_LABELS.foh}</SelectItem>
                    <SelectItem value="boh">{POOL_AREA_LABELS.boh}</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {days.map((day) => (
                <div key={day} className="space-y-1.5">
                  <Label htmlFor={`tip-${day}`} className="text-xs text-muted-foreground">
                    {formatDayLabel(day)}
                  </Label>
                  <Input
                    id={`tip-${day}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={locked}
                    key={`${day}-${poolArea}-${poolFor(day)}`}
                    defaultValue={poolFor(day) ? String(poolFor(day)) : ""}
                    onBlur={(e) => {
                      const value = parseAmount(e.target.value, { min: 0, max: 100000, label: "Tips" });
                      if (value === null) {
                        e.target.value = poolFor(day) ? String(poolFor(day)) : "";
                        return;
                      }
                      if (value !== poolFor(day)) poolMutation.mutate({ poolDate: day, area: poolArea, amount: value });
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="surface overflow-hidden" aria-labelledby="paysheet-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
          <SectionHeader
            title={<span id="paysheet-heading">Pay sheet</span>}
            description={
              data.isCombined
                ? `${data.periodCount} weekly pay sheet${data.periodCount === 1 ? "" : "s"} combined per employee. Read-only.`
                : data.period
                  ? locked
                    ? "Closed as paid."
                    : "Draft. Rebuild any time after changing hours or tips."
                  : "Not built yet for this week."
            }
          />
          {data.period && !data.isCombined ? (
            <Button variant="outline" onClick={() => void toggleWeek()} disabled={closeMutation.isPending}>
              {locked ? "Reopen week" : "Close week as paid"}
            </Button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Wages</TableHead>
                <TableHead className="text-right">Tips</TableHead>
                <TableHead className="text-right">Adjustment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead className="pr-6 text-right">Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    {data.isCombined ? "No pay sheets fall entirely inside these dates." : "Build the pay sheet to see everyone's pay for this week."}
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => {
                  const who = nameOf(line.employeeId);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="pl-6 font-medium">{who}</TableCell>
                      <TableCell className="text-right tabular-nums">{hoursLabel(line.hours)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.hourlyRate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.wages)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.tips)}</TableCell>
                      <TableCell className="p-1 text-right">
                        {data.isCombined || locked ? (
                          <span className="pr-3 tabular-nums">{money(line.adjustments)}</span>
                        ) : (
                          <Input
                            aria-label={`Adjustment for ${who}`}
                            className="ml-auto h-9 w-24 text-right"
                            inputMode="decimal"
                            key={`${line.id}-${line.adjustments}`}
                            defaultValue={line.adjustments ? String(line.adjustments) : ""}
                            placeholder="0"
                            onBlur={(e) => {
                              const value = parseAmount(e.target.value, { min: -100000, max: 100000, label: "Adjustment" });
                              if (value === null) {
                                e.target.value = line.adjustments ? String(line.adjustments) : "";
                                return;
                              }
                              if (value !== line.adjustments) lineMutation.mutate({ lineId: line.id, adjustments: value });
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{money(line.total)}</TableCell>
                      <TableCell>{PAY_METHOD_LABELS[line.payMethod]}</TableCell>
                      <TableCell className="pr-6 text-right">
                        {data.isCombined ? (
                          <Badge variant={line.paid ? "success" : "warning"}>{line.paid ? "All paid" : "Payment due"}</Badge>
                        ) : line.paid ? (
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant={line.acknowledgedAt ? "success" : "secondary"}>
                              {line.acknowledgedAt ? "Paid and confirmed" : "Paid"}
                            </Badge>
                            {!locked ? (
                              <Button variant="ghost" size="sm" onClick={() => void undoPayout(line.id, who)}>
                                Undo
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <Button size="sm" disabled={locked} onClick={() => paidMutation.mutate({ lineId: line.id, paid: true })}>
                            <Banknote />
                            Mark paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </PageContainer>
  );
}

function HoursGrid({
  title,
  rows,
  days,
  locked,
  onEnter,
}: {
  title: string;
  rows: Person[];
  days: string[];
  locked: boolean;
  onEnter: (person: Person, index: number, raw: string, reset: () => void) => void;
}) {
  const cell = (person: Person, index: number, day: string, className: string) => {
    const current = person.minutesByDay[index] ? String(minutesToHours(person.minutesByDay[index]!)) : "";
    return (
      <Input
        aria-label={`${person.fullName}, hours on ${formatDayLabel(day)}`}
        className={className}
        inputMode="decimal"
        disabled={locked}
        defaultValue={current}
        key={`${person.id}-${day}-${person.minutesByDay[index]}`}
        placeholder="0"
        onBlur={(e) => {
          const input = e.target;
          onEnter(person, index, input.value, () => (input.value = current));
        }}
      />
    );
  };

  return (
    <section className="surface overflow-hidden" aria-label={`${title} hours`}>
      <div className="p-5 pb-3 sm:p-6 sm:pb-3">
        <SectionHeader title={`${title} hours`} description="Clocked time fills in on its own. Type a number to correct a day." />
      </div>
      {rows.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No active employees work here yet.</p>
      ) : (
        <>
          {/* Phones: one card per person */}
          <ul className="divide-y md:hidden">
            {rows.map((person) => (
              <li key={person.id} className="space-y-3 px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{person.fullName}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {hoursLabel(person.hours)}, {money(person.tipShare)} tips
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {days.map((day, index) => (
                    <label key={day} className="space-y-1 text-xs text-muted-foreground">
                      <span>{formatDayLabel(day)}</span>
                      {cell(person, index, day, "h-10 text-center")}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {/* Larger screens: the weekly grid */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40 pl-6">Name</TableHead>
                  {days.map((day) => (
                    <TableHead key={day} className="text-center">
                      {formatDayLabel(day)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Week</TableHead>
                  <TableHead className="pr-6 text-right">Tips</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="pl-6 font-medium">
                      {person.fullName}
                      <div className="text-xs font-normal text-muted-foreground">
                        {money(person.hourlyRate)}/hr, {PAY_METHOD_LABELS[person.payMethod]}
                      </div>
                    </TableCell>
                    {days.map((day, index) => (
                      <TableCell key={day} className="p-1 text-center">
                        {cell(person, index, day, "mx-auto h-9 w-16 text-center")}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">{hoursLabel(person.hours)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{money(person.tipShare)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
