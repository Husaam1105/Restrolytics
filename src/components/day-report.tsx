import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Clock, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  ISSUE_CATEGORIES,
  deleteDayIssue,
  getDayReport,
  logDayIssue,
  type IssueCategory,
} from "@/lib/daily.functions";
import { RANGES, rangeDates } from "@/lib/date-ranges";
import { useRestaurantClock } from "@/lib/workspace";
import {
  AREA_LABELS,
  PAY_METHOD_LABELS,
  formatDateRange,
  formatDayLabel,
  hoursLabel,
  money,
} from "@/lib/payroll";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const CATEGORY_LABELS = Object.fromEntries(ISSUE_CATEGORIES.map((c) => [c.id, c.label])) as Record<
  IssueCategory,
  string
>;

export function DayReport() {
  const [preset, setPreset] = useState("today");
  const clock = useRestaurantClock();
  const [custom, setCustom] = useState(() => rangeDates("today", clock.today, clock.weekStartsOn));
  const range = preset === "custom" ? custom : rangeDates(preset, clock.today, clock.weekStartsOn);
  const queryClient = useQueryClient();
  const fetchReport = useServerFn(getDayReport);
  const addIssue = useServerFn(logDayIssue);
  const removeIssue = useServerFn(deleteDayIssue);

  const report = useQuery({
    queryKey: ["day-report", range.from, range.to],
    queryFn: () => fetchReport({ data: { from: range.from, to: range.to } }),
  });

  const [category, setCategory] = useState<IssueCategory>("void");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["day-report"] });

  const saveIssue = useMutation({
    mutationFn: () =>
      addIssue({
        data: {
          date: report.data?.date ?? "",
          category,
          amount: Number(amount) || 0,
          description,
        },
      }),
    onSuccess: () => {
      setAmount("");
      setDescription("");
      toast.success("Logged");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dropIssue = useMutation({
    mutationFn: (id: string) => removeIssue({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (report.isLoading || !report.data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading the day…
        </CardContent>
      </Card>
    );
  }

  const data = report.data;
  const isSingle = range.from === range.to;
  const isToday = data.today === range.to;

  const longDate = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  const shortDate = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  const title =
    preset === "today"
      ? "Today"
      : preset === "yesterday"
        ? "Yesterday"
        : isSingle
          ? formatDayLabel(range.from)
          : formatDateRange(range.from, range.to);
  const subtitle = isSingle
    ? longDate(range.from)
    : `${shortDate(range.from)} to ${shortDate(range.to)}, ${range.to.slice(0, 4)}`;

  return (
    <div className="space-y-6">
      <div className="border-t pt-6">
        <h2 className="text-title">{title}</h2>
        <p className="text-sm text-muted-foreground">Operating report, {subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={preset === r.id ? "default" : "outline"}
            onClick={() => setPreset(r.id)}
          >
            {r.label}
          </Button>
        ))}
        {preset === "custom" ? (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-36"
              value={custom.from}
              max={data.today}
              aria-label="From date"
              onChange={(event) => {
                const from = event.target.value || custom.from;
                setCustom({ from, to: from > custom.to ? from : custom.to });
              }}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              className="w-36"
              value={custom.to}
              max={data.today}
              min={custom.from}
              aria-label="To date"
              onChange={(event) => {
                const to = event.target.value || custom.to;
                setCustom(to < custom.from ? { from: to, to: custom.from } : { ...custom, to });
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          title="Total taken"
          value={money(data.totals.gross)}
          note={`${data.totals.orders} orders, ${money(data.totals.averageTicket)} average ticket`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <Tile
          title="Sales after tax & tips"
          value={money(data.totals.netSales)}
          note={`After ${money(data.totals.tax)} tax and ${money(data.totals.tips)} tips`}
        />
        <Tile
          title="Labour"
          value={money(data.totals.labourCost)}
          note={`${hoursLabel(data.totals.labourHours)}, ${data.totals.labourPercent}% of sales`}
          icon={<Clock className="h-4 w-4" />}
        />
        <Tile
          title="Mistakes & losses"
          value={money(data.totals.lossTotal)}
          note={`${data.totals.lossCount} logged`}
          icon={<AlertTriangle className="h-4 w-4" />}
          alert={data.totals.lossCount > 0}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-surface-subtle/60">
          <CardTitle>Sales mix</CardTitle>
          <CardDescription>
            Revenue and order volume by channel for {isSingle ? "this day" : "this period"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="chart-enter h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.platforms} margin={{ left: -12, right: 8 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => money(value)}
                  cursor={{ fill: "var(--color-muted)" }}
                />
                <Bar
                  dataKey="gross"
                  name="Total taken"
                  fill="var(--color-chart-1)"
                  radius={[5, 5, 0, 0]}
                />
                <Bar dataKey="net" name="Sales" fill="var(--color-chart-3)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where the money came from</CardTitle>
          <CardDescription>
            Toast POS and each delivery app, for {isSingle ? "this day" : "this period"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sales recorded for this day yet. Connect Toast, Uber Eats, DoorDash or Grubhub on
              the Sales page to fill this in automatically.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total taken</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Tips</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.platforms.map((row) => (
                  <TableRow key={row.platform}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.orders}</TableCell>
                    <TableCell className="text-right font-medium">{money(row.gross)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {money(row.tax)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {money(row.tips)}
                    </TableCell>
                    <TableCell className="text-right">{money(row.net)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {data.totals.gross > 0
                        ? `${Math.round((row.gross / data.totals.gross) * 100)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">All channels</TableCell>
                  <TableCell className="text-right font-semibold">{data.totals.orders}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {money(data.totals.gross)}
                  </TableCell>
                  <TableCell className="text-right">{money(data.totals.tax)}</TableCell>
                  <TableCell className="text-right">{money(data.totals.tips)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {money(data.totals.netSales)}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What went wrong {isSingle ? "on this day" : "in this period"}</CardTitle>
            <CardDescription>
              Voids, refunds, remakes, waste and complaints, plus anything the delivery apps
              cancelled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-[1fr_7rem] sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="issue-note">What happened</Label>
                <Input
                  id="issue-note"
                  placeholder="e.g. remade burger, wrong order sent out"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="issue-amount">Cost</Label>
                <Input
                  id="issue-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as IssueCategory)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_CATEGORIES.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => saveIssue.mutate()}
                disabled={saveIssue.isPending || !description.trim()}
              >
                {saveIssue.isPending ? "Saving…" : "Log it"}
              </Button>
            </div>

            <div className="space-y-3">
              {data.issues.length === 0 && data.failedSales.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing logged yet today.</p>
              )}
              {data.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start justify-between gap-3 border-b pb-3"
                >
                  <div>
                    <p className="text-sm font-medium">{issue.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[issue.category]}
                      {issue.by ? `, logged by ${issue.by.split("@")[0]}` : ""} at{" "}
                      {new Date(issue.at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{money(issue.amount)}</span>
                    {data.canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dropIssue.mutate(issue.id)}
                        disabled={dropIssue.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {data.failedSales.map((sale) => (
                <div key={sale.id} className="flex items-start justify-between gap-3 border-b pb-3">
                  <div>
                    <p className="text-sm font-medium">
                      {sale.label} order {sale.orderNumber ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{sale.status}</p>
                  </div>
                  <span className="text-sm font-medium">{money(sale.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Who worked
            </CardTitle>
            <CardDescription>
              Hours from the time clock, with what the day cost in wages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.worked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hours recorded for this day. Staff clock in on the Time clock page, or a manager
                can enter hours on Payroll.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Wages</TableHead>
                    <TableHead>Paid by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.worked.map((person) => (
                    <TableRow key={person.employeeId}>
                      <TableCell className="font-medium">
                        {person.name}
                        {person.openShift && (
                          <Badge variant="secondary" className="ml-2">
                            On shift
                          </Badge>
                        )}
                        {person.position && (
                          <span className="block text-xs text-muted-foreground">
                            {person.position}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {AREA_LABELS[person.area as keyof typeof AREA_LABELS] ?? person.area}
                      </TableCell>
                      <TableCell className="text-right">{hoursLabel(person.hours)}</TableCell>
                      <TableCell className="text-right">{money(person.wages)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {PAY_METHOD_LABELS[person.payMethod as keyof typeof PAY_METHOD_LABELS] ??
                          person.payMethod}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-semibold" colSpan={2}>
                      Total
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {hoursLabel(data.totals.labourHours)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {money(data.totals.labourCost)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            )}
            {data.totals.tipPool > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Tip pool entered for {isSingle ? "this day" : "this period"}:{" "}
                {money(data.totals.tipPool)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Tile({
  title,
  value,
  note,
  icon,
  alert,
}: {
  title: string;
  value: string;
  note?: string;
  icon?: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "bg-warning-soft" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && (
          <span className={alert ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
        )}
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl font-bold">{value}</div>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
