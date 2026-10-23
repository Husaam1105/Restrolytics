import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  ChefHat,
  ConciergeBell,
  PackageCheck,
  Receipt,
  Timer,
  Warehouse,
} from "lucide-react";

import {
  getDashboardStats,
  getInventoryAlerts,
  getPlatformBreakdown,
  getRecentSales,
  getSalesChartData,
} from "@/lib/dashboard.functions";
import { getMyTimeclock } from "@/lib/payroll.functions";
import { platformLabel } from "@/lib/sales";
import { formatCurrency } from "@/lib/utils";
import { DayReport } from "@/components/day-report";
import { PageContainer, PageHeader, SectionHeader } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState, QueryBoundary } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard · Restrolytics" }] }),
});

const stats = { queryKey: ["dashboard", "stats"], queryFn: () => getDashboardStats() };

function longDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function DashboardPage() {
  const query = useQuery(stats);

  if (query.isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </PageContainer>
    );
  }
  if (query.isError || !query.data) {
    return (
      <PageContainer>
        <ErrorState
          title="The dashboard didn't load"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  }
  return query.data.isManager ? (
    <ManagerDashboard data={query.data} />
  ) : (
    <StaffToday data={query.data} />
  );
}

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

/* ------------------------------------------------------------------ manager */

function ManagerDashboard({ data }: { data: Stats }) {
  return (
    <PageContainer>
      <PageHeader
        context={data.restaurantName}
        title="Dashboard"
        description={longDate(data.today)}
        actions={
          <Button variant="outline" asChild>
            <Link to="/copilot">
              <BrainCircuit />
              Ask IQ about today
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sales today"
          value={formatCurrency(data.todayRevenue)}
          icon={<Receipt />}
          variant="ticket"
          note={`${formatCurrency(data.todayTips)} in tips`}
        />
        <StatCard
          label="Orders today"
          value={data.todayOrders.toLocaleString("en-US")}
          icon={<ConciergeBell />}
          note="All channels"
        />
        <StatCard
          label="Low stock"
          value={data.lowStockCount}
          icon={<PackageCheck />}
          tone={data.lowStockCount > 0 ? "warning" : "positive"}
          note={
            data.lowStockCount > 0 ? "At or below reorder level" : "Everything above reorder level"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SalesChart />
        <ChannelShare />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <RecentOrders />
        <LowStock />
      </div>

      <DayReport />
    </PageContainer>
  );
}

const salesChartConfig = {
  total: { label: "Sales", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

type BarShape = { x?: number; y?: number; width?: number; height?: number };

/** Earlier days: pale ledger green, so today stands out. */
function PastBar({ x = 0, y = 0, width = 0, height = 0 }: BarShape) {
  if (height <= 0) return <g />;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={4}
      fill="color-mix(in oklab, var(--color-total) 34%, var(--color-card))"
    />
  );
}

/** Today's bar: ink, with a highlighter stroke across the top. */
function TodayBar({ x = 0, y = 0, width = 0, height = 0 }: BarShape) {
  if (height <= 0) return <g />;
  const cap = Math.min(6, height);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill="var(--color-foreground)" />
      <rect x={x} y={y} width={width} height={cap} rx={3} fill="var(--color-highlight)" />
    </g>
  );
}

function SalesChart() {
  const query = useQuery({
    queryKey: ["dashboard", "sales-chart"],
    queryFn: () => getSalesChartData(),
  });
  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="sales-7d">
      <SectionHeader
        title={<span id="sales-7d">Sales, last 7 days</span>}
        description="Gross sales across every channel, by business day."
      />
      <div className="mt-5">
        <QueryBoundary
          query={query}
          loading={<Skeleton className="h-64 rounded-xl" />}
          errorTitle="Sales chart didn't load"
        >
          {(chart) =>
            chart.points.every((p) => p.total === 0) ? (
              <EmptyState
                title="No sales in the last 7 days"
                description="Upload a Toast sales summary or an Uber Eats report to see daily sales here."
                action={
                  <Button size="sm" asChild>
                    <Link to="/sales">Go to sales</Link>
                  </Button>
                }
              />
            ) : (
              <ChartContainer config={salesChartConfig} className="chart-enter h-64 w-full">
                <BarChart data={chart.points} margin={{ left: 4, right: 4, top: 4 }}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="0"
                    stroke="var(--color-border)"
                  />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    width={56}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${Math.round(v / 100) / 10}k` : `$${v}`
                    }
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    content={
                      <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                    }
                  />
                  {/* Past days in pale ledger green; today is the one marked up. */}
                  <Bar
                    dataKey="total"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                    shape={(props: unknown) => {
                      const bar = props as BarShape & { index?: number };
                      return bar.index === chart.points.length - 1 ? (
                        <TodayBar {...bar} />
                      ) : (
                        <PastBar {...bar} />
                      );
                    }}
                  />
                </BarChart>
              </ChartContainer>
            )
          }
        </QueryBoundary>
      </div>
    </section>
  );
}

function ChannelShare() {
  const query = useQuery({
    queryKey: ["dashboard", "platform-breakdown"],
    queryFn: () => getPlatformBreakdown(),
  });
  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="channels-30d">
      <SectionHeader
        title={<span id="channels-30d">Sales by channel</span>}
        description="Last 30 days."
      />
      <div className="mt-5">
        <QueryBoundary
          query={query}
          loading={<LoadingState rows={4} />}
          errorTitle="Channel breakdown didn't load"
          isEmpty={(d) => d.data.length === 0}
          empty={
            <p className="text-sm text-muted-foreground">No sales recorded in the last 30 days.</p>
          }
        >
          {(d) => {
            const total = d.data.reduce((sum, c) => sum + c.total, 0);
            return (
              <ul className="space-y-4">
                {d.data.map((channel) => {
                  const share = total > 0 ? Math.round((channel.total / total) * 100) : 0;
                  return (
                    <li key={channel.platform}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium">{channel.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {formatCurrency(channel.total)}
                          </span>{" "}
                          ({share}%)
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                        role="img"
                        aria-label={`${channel.label}: ${share}% of sales`}
                      >
                        <div
                          className="h-full rounded-full bg-chart-1"
                          style={{ width: `${Math.max(share, 2)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          }}
        </QueryBoundary>
      </div>
    </section>
  );
}

function RecentOrders() {
  const query = useQuery({
    queryKey: ["dashboard", "recent-sales"],
    queryFn: () => getRecentSales(),
  });
  return (
    <section className="surface overflow-hidden" aria-labelledby="recent-orders">
      <div className="p-5 pb-3 sm:p-6 sm:pb-3">
        <SectionHeader
          title={<span id="recent-orders">Recent orders</span>}
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sales">View all sales</Link>
            </Button>
          }
        />
      </div>
      <QueryBoundary
        query={query}
        loading={<LoadingState rows={4} className="p-5" />}
        errorTitle="Recent orders didn't load"
        isEmpty={(d) => d.sales.length === 0}
        empty={
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No orders yet. They appear here as soon as sales are imported.
          </p>
        }
      >
        {(d) => (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Order</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="pr-6 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="pl-6 font-medium">
                      {sale.order_number ?? "No number"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{platformLabel(sale.platform)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sale.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="pr-6 text-right font-semibold tabular-nums">
                      {formatCurrency(sale.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryBoundary>
    </section>
  );
}

function LowStock() {
  const query = useQuery({
    queryKey: ["dashboard", "inventory-alerts"],
    queryFn: () => getInventoryAlerts(),
  });
  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="low-stock">
      <SectionHeader
        title={<span id="low-stock">Low stock</span>}
        description="At or below reorder level."
      />
      <div className="mt-4">
        <QueryBoundary
          query={query}
          loading={<LoadingState rows={3} />}
          errorTitle="Stock alerts didn't load"
          isEmpty={(d) => d.items.length === 0}
          empty={<p className="text-sm text-muted-foreground">Nothing is running low. Nice.</p>}
        >
          {(d) => (
            <ul className="divide-y">
              {d.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {item.current_stock} {item.unit} on hand, reorder at {item.reorder_level}
                    </p>
                  </div>
                  <Badge variant="warning">
                    <AlertTriangle aria-hidden="true" />
                    Low
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </div>
      <Button variant="outline" className="mt-5 w-full" asChild>
        <Link to="/inventory">Open inventory</Link>
      </Button>
    </section>
  );
}

/* -------------------------------------------------------------------- staff */

function StaffToday({ data }: { data: Stats }) {
  const clock = useQuery({ queryKey: ["timeclock", "me"], queryFn: () => getMyTimeclock() });
  const name = clock.data?.employee?.fullName.split(" ")[0];

  const shortcuts = [
    {
      to: "/timeclock",
      icon: Timer,
      title: "Time clock",
      text: "Clock in, clock out and see your hours.",
    },
    {
      to: "/foh",
      icon: ConciergeBell,
      title: "Front of house",
      text: "Opening and closing checklists.",
    },
    { to: "/boh", icon: ChefHat, title: "Kitchen", text: "Line, prep and closing checklists." },
    { to: "/shifts", icon: CalendarDays, title: "Schedule", text: "Your upcoming shifts." },
    {
      to: "/inventory/storage",
      icon: Warehouse,
      title: "Stock counts",
      text: "Count a storage area.",
    },
    {
      to: "/copilot",
      icon: BrainCircuit,
      title: "Ask IQ",
      text: "About your hours, pay or tasks.",
    },
  ] as const;

  return (
    <PageContainer>
      <PageHeader
        context={data.restaurantName}
        title={name ? `Hi, ${name}` : "Today"}
        description={longDate(data.today)}
      />

      <QueryBoundary
        query={clock}
        loading={<Skeleton className="h-28 rounded-2xl" />}
        errorTitle="Your time clock didn't load"
      >
        {(c) =>
          c.employee ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Right now"
                value={c.openEntry ? "On the clock" : "Off the clock"}
                tone={c.openEntry ? "positive" : "default"}
                note={
                  c.openEntry?.clockIn
                    ? `Since ${new Date(c.openEntry.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                    : "Clock in from the Time clock page when your shift starts."
                }
                icon={<Timer />}
              />
              <StatCard
                label="Hours this week"
                value={c.weekHours.toFixed(2)}
                icon={<CalendarDays />}
                note="Including today"
              />
            </div>
          ) : (
            <EmptyState
              title="Your login isn't linked to an employee yet"
              description="Ask a manager to link this login on the Employees page. Until then, hours and pay won't show here."
            />
          )
        }
      </QueryBoundary>

      {data.lowStockCount > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-warning-soft px-5 py-4 text-sm">
          <AlertTriangle
            className="size-5 shrink-0 text-warning-foreground dark:text-warning"
            aria-hidden="true"
          />
          <p>
            <span className="font-semibold">
              {data.lowStockCount} item{data.lowStockCount === 1 ? "" : "s"} running low.
            </span>{" "}
            Let your manager know if you use the last of something.
          </p>
        </div>
      ) : null}

      <nav aria-label="Shortcuts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map(({ to, icon: Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="surface group flex items-start gap-4 p-5 transition-[box-shadow] hover:shadow-[var(--shadow-ring),var(--shadow-md)]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-link">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="block text-sm text-muted-foreground">{text}</span>
            </span>
          </Link>
        ))}
      </nav>
    </PageContainer>
  );
}
