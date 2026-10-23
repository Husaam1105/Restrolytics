import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Clock3, LogIn, LogOut, Receipt, Wallet } from "lucide-react";

import { MyDetails } from "@/components/my-details";
import { PageContainer, PageHeader, SectionHeader } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { acknowledgePay, clockIn, clockOut, getMyTimeclock } from "@/lib/payroll.functions";
import {
  AREA_LABELS,
  PAY_METHOD_LABELS,
  formatClockTime,
  formatDateRange,
  formatDayLabel,
  hoursLabel,
  minutesToHours,
  money,
} from "@/lib/payroll";

/** Staff time clock: clock in/out, this week's timecard, pay receipts, own details. */
export function TimeclockPanel() {
  const queryClient = useQueryClient();
  const fetchClock = useServerFn(getMyTimeclock);
  const start = useServerFn(clockIn);
  const stop = useServerFn(clockOut);
  const confirmPay = useServerFn(acknowledgePay);
  const query = useQuery({ queryKey: ["timeclock"], queryFn: () => fetchClock() });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["timeclock"] });
    queryClient.invalidateQueries({ queryKey: ["timeclock", "me"] });
    queryClient.invalidateQueries({ queryKey: ["payroll-week"] });
  };
  const onError = (e: Error) => toast.error(e.message);
  const clockInMutation = useMutation({
    mutationFn: () => start({ data: {} }),
    onSuccess: () => {
      toast.success("Clocked in. Have a good shift.");
      refresh();
    },
    onError,
  });
  const clockOutMutation = useMutation({
    mutationFn: () => stop({ data: {} }),
    onSuccess: () => {
      toast.success("Clocked out");
      refresh();
    },
    onError,
  });
  const acknowledge = useMutation({
    mutationFn: (lineId: string) => confirmPay({ data: { lineId } }),
    onSuccess: () => {
      toast.success("Thanks. Your manager can see you received it.");
      refresh();
    },
    onError,
  });

  const header = <PageHeader title="My hours and pay" />;

  if (query.isPending) {
    return (
      <PageContainer size="narrow">
        {header}
        <LoadingState rows={4} />
      </PageContainer>
    );
  }
  if (query.isError) {
    return (
      <PageContainer size="narrow">
        {header}
        <ErrorState
          title="Your time clock didn't load"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  }

  const data = query.data;
  if (!data.employee) {
    return (
      <PageContainer size="narrow">
        {header}
        <EmptyState
          title="Your login isn't linked to an employee yet"
          description="Ask your manager to link it on the Employees page. Once that's done you can clock in and see your hours and pay here."
        />
        <MyDetails />
      </PageContainer>
    );
  }

  const timezone = data.timezone;
  const employee = data.employee;
  const paid = data.pay.filter((line) => line.paid).reduce((sum, line) => sum + line.total, 0);
  const onClock = Boolean(data.openEntry);
  const busy = clockInMutation.isPending || clockOutMutation.isPending;

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="My hours and pay"
        description={[employee.fullName, AREA_LABELS[employee.area], employee.position]
          .filter(Boolean)
          .join(", ")}
      />

      <section
        className={`surface-raised flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 ${onClock ? "bg-success-soft" : ""}`}
        aria-live="polite"
      >
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span
              className={`size-2.5 rounded-full ${onClock ? "bg-success" : "bg-muted-foreground/40"}`}
              aria-hidden="true"
            />
            {onClock ? "On the clock" : "Off the clock"}
          </p>
          <p className="text-figure mt-2 text-4xl">
            {onClock && data.openEntry
              ? `Since ${formatClockTime(data.openEntry.clockIn, timezone)}`
              : "Ready when you are"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hoursLabel(data.weekHours)} this pay week (
            {formatDateRange(data.weekStart, data.weekEnd)})
          </p>
        </div>
        {onClock ? (
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-8 text-base sm:w-56"
            onClick={() => clockOutMutation.mutate()}
            disabled={busy}
          >
            <LogOut className="size-5" />
            {clockOutMutation.isPending ? "Clocking out…" : "Clock out"}
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-14 px-8 text-base sm:w-56"
            onClick={() => clockInMutation.mutate()}
            disabled={busy}
          >
            <LogIn className="size-5" />
            {clockInMutation.isPending ? "Clocking in…" : "Clock in"}
          </Button>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This week" value={hoursLabel(data.weekHours)} icon={<Clock3 />} />
        <StatCard label="Recently paid" value={money(paid)} icon={<Receipt />} />
        <StatCard label="Paid by" value={PAY_METHOD_LABELS[employee.payMethod]} icon={<Wallet />} />
      </div>

      <section className="surface overflow-hidden" aria-labelledby="timecard-heading">
        <div className="p-5 pb-3 sm:p-6 sm:pb-3">
          <SectionHeader
            title={<span id="timecard-heading">My timecard</span>}
            description="Every shift recorded this pay week."
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Day</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead className="pr-6 text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No shifts yet this week.
                  </TableCell>
                </TableRow>
              ) : (
                data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-6 font-medium">
                      {formatDayLabel(entry.workDate)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatClockTime(entry.clockIn, timezone)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatClockTime(entry.clockOut, timezone)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {entry.source === "clock" ? "Time clock" : "Manager"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right font-semibold tabular-nums">
                      {hoursLabel(minutesToHours(entry.minutes))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="surface space-y-4 p-5 sm:p-6" aria-labelledby="pay-heading">
        <SectionHeader
          title={<span id="pay-heading">Pay</span>}
          description="When your manager marks a payout paid, confirm here once you have it."
        />
        {data.pay.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pay sheets yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.pay.map((line) => (
              <li key={line.id} className="rounded-xl bg-muted/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {line.startDate && line.endDate
                        ? formatDateRange(line.startDate, line.endDate)
                        : "Pay week"}
                    </p>
                    <p className="text-figure mt-1 text-2xl">{money(line.total)}</p>
                  </div>
                  {line.acknowledgedAt ? (
                    <Badge variant="success">
                      <CheckCircle2 aria-hidden="true" />
                      Received
                    </Badge>
                  ) : line.paid ? (
                    <Button
                      size="sm"
                      onClick={() => acknowledge.mutate(line.id)}
                      disabled={acknowledge.isPending}
                    >
                      I&apos;ve received it
                    </Button>
                  ) : (
                    <Badge variant="secondary">Not paid yet</Badge>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-4">
                  <div>
                    <dt className="sr-only">Hours</dt>
                    <dd>{hoursLabel(line.hours)} worked</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Wages</dt>
                    <dd>Wages {money(line.wages)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Tips</dt>
                    <dd>Tips {money(line.tips)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Paid by</dt>
                    <dd>{PAY_METHOD_LABELS[line.payMethod]}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MyDetails />
    </PageContainer>
  );
}
