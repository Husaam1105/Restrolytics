import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Clock3, LogIn, LogOut, Receipt, UserRoundCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MyDetails } from "@/components/my-details";
import { acknowledgePay, clockIn, clockOut, getMyTimeclock } from "@/lib/payroll.functions";
import { AREA_LABELS, PAY_METHOD_LABELS, formatClockTime, formatDateRange, formatDayLabel, hoursLabel, minutesToHours, money } from "@/lib/payroll";
export function TimeclockPanel() {
  const queryClient = useQueryClient();
  const fetchClock = useServerFn(getMyTimeclock);
  const start = useServerFn(clockIn);
  const stop = useServerFn(clockOut);
  const confirmPay = useServerFn(acknowledgePay);
  const { data } = useQuery({ queryKey: ["timeclock"], queryFn: () => fetchClock() });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["timeclock"] }); queryClient.invalidateQueries({ queryKey: ["payroll-week"] }); };
  const clockInMutation = useMutation({ mutationFn: () => start({ data: {} }), onSuccess: () => { toast.success("Clocked in"); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const clockOutMutation = useMutation({ mutationFn: () => stop({ data: {} }), onSuccess: () => { toast.success("Clocked out"); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const acknowledge = useMutation({ mutationFn: (lineId: string) => confirmPay({ data: { lineId } }), onSuccess: () => { toast.success("Payment confirmed"); refresh(); }, onError: (e: Error) => toast.error(e.message) });

  if (data && !data.employee) return <div className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-lg border bg-card p-8 text-center shadow-xs"><UserRoundCheck className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-4 text-xl font-bold">Connect your employee login</h1><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">A manager needs to link this login to your employee record before you can clock in and see your hours or pay.</p><Button asChild className="mt-5" variant="outline"><Link to="/settings/access">Open employee access</Link></Button></div></div>;

  const timezone = data?.timezone ?? "UTC";
  const paid = (data?.pay ?? []).filter((line) => line.paid).reduce((sum, line) => sum + line.total, 0);
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-6">
    <header><p className="text-xs font-semibold uppercase text-muted-foreground">My workspace</p><h1 className="text-3xl font-bold">My hours & pay</h1><p className="mt-1 text-sm text-muted-foreground">{data?.employee ? `${data.employee.fullName} · ${AREA_LABELS[data.employee.area]}${data.employee.position ? ` · ${data.employee.position}` : ""}` : "Loading your employee record…"}</p></header>

    <section className="grid overflow-hidden rounded-lg border bg-primary text-primary-foreground shadow-sm lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="p-6 lg:p-8"><div className="flex items-center gap-2 text-sm text-primary-foreground/70"><span className={`size-2 rounded-full ${data?.openEntry ? "bg-success" : "bg-primary-foreground/40"}`} />{data?.openEntry ? "On the clock" : "Ready for your shift"}</div><h2 className="mt-3 text-3xl font-bold">{data?.openEntry ? `Started ${formatClockTime(data.openEntry.clockIn, timezone)}` : "Clocked out"}</h2><p className="mt-2 text-sm text-primary-foreground/70">{data ? `${formatDateRange(data.weekStart, data.weekEnd)} · ${hoursLabel(data.weekHours)} recorded` : "Loading…"}</p></div>
      <div className="grid place-items-center border-t border-primary-foreground/15 p-6 lg:border-l lg:border-t-0">{data?.openEntry ? <Button size="lg" variant="secondary" className="w-full" onClick={() => clockOutMutation.mutate()} disabled={clockOutMutation.isPending}><LogOut className="mr-2 size-5" />Clock out</Button> : <Button size="lg" variant="secondary" className="w-full" onClick={() => clockInMutation.mutate()} disabled={clockInMutation.isPending}><LogIn className="mr-2 size-5" />Clock in</Button>}</div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3"><Metric icon={Clock3} label="This week" value={hoursLabel(data?.weekHours ?? 0)} /><Metric icon={Receipt} label="Recent paid" value={money(paid)} /><Metric icon={CalendarDays} label="Pay method" value={data?.employee ? PAY_METHOD_LABELS[data.employee.payMethod] : "—"} /></section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <Card className="overflow-hidden rounded-lg shadow-xs"><CardHeader><CardTitle>My timecard</CardTitle><CardDescription>Every shift recorded for this pay week.</CardDescription></CardHeader><CardContent className="px-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Day</TableHead><TableHead>In</TableHead><TableHead>Out</TableHead><TableHead>Entry</TableHead><TableHead className="text-right">Hours</TableHead></TableRow></TableHeader><TableBody>{(data?.entries ?? []).length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No shifts recorded this week.</TableCell></TableRow> : (data?.entries ?? []).map((entry) => <TableRow key={entry.id}><TableCell className="font-medium">{formatDayLabel(entry.workDate)}</TableCell><TableCell className="font-mono text-xs">{formatClockTime(entry.clockIn, timezone)}</TableCell><TableCell className="font-mono text-xs">{formatClockTime(entry.clockOut, timezone)}</TableCell><TableCell><Badge variant="outline">{entry.source === "clock" ? "Time clock" : "Manager entry"}</Badge></TableCell><TableCell className="text-right font-mono font-semibold">{hoursLabel(minutesToHours(entry.minutes))}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>

      <Card className="rounded-lg shadow-xs"><CardHeader><CardTitle>Pay receipts</CardTitle><CardDescription>Confirm when your payment is received.</CardDescription></CardHeader><CardContent className="space-y-3">{(data?.pay ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No payroll records yet.</p> : (data?.pay ?? []).map((line) => <div key={line.id} className="rounded-md border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{line.startDate && line.endDate ? formatDateRange(line.startDate, line.endDate) : "Pay week"}</p><p className="mt-1 font-mono text-xl font-bold">{money(line.total)}</p></div>{line.acknowledgedAt ? <Badge className="bg-success text-success-foreground"><CheckCircle2 className="mr-1 size-3" />Received</Badge> : line.paid ? <Button size="sm" variant="outline" onClick={() => acknowledge.mutate(line.id)}>I got it</Button> : <Badge variant="secondary">Pending</Badge>}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span>{hoursLabel(line.hours)} worked</span><span>{PAY_METHOD_LABELS[line.payMethod]}</span><span>Wages {money(line.wages)}</span><span>Tips {money(line.tips)}</span></div></div>)}</CardContent></Card>
    </div>
    <MyDetails />
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="rounded-lg border bg-card p-4 shadow-xs"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" />{label}</div><p className="mt-2 font-mono text-xl font-bold">{value}</p></div>;
}
