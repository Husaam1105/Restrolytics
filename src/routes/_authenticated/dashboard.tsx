import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getDashboardStats,
  getInventoryAlerts,
  getPlatformBreakdown,
  getRecentSales,
  getSalesChartData,
} from "@/lib/dashboard.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DayReport } from "@/components/day-report";

const statsQueryOptions = () => ({
  queryKey: ["dashboard", "stats"],
  queryFn: () => getDashboardStats(),
});

const salesQueryOptions = () => ({
  queryKey: ["dashboard", "recent-sales"],
  queryFn: () => getRecentSales(),
});

const alertsQueryOptions = () => ({
  queryKey: ["dashboard", "inventory-alerts"],
  queryFn: () => getInventoryAlerts(),
});

const chartQueryOptions = () => ({
  queryKey: ["dashboard", "sales-chart"],
  queryFn: () => getSalesChartData(),
});

const platformQueryOptions = () => ({
  queryKey: ["dashboard", "platform-breakdown"],
  queryFn: () => getPlatformBreakdown(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(statsQueryOptions());
    context.queryClient.ensureQueryData(salesQueryOptions());
    context.queryClient.ensureQueryData(alertsQueryOptions());
    context.queryClient.ensureQueryData(chartQueryOptions());
    context.queryClient.ensureQueryData(platformQueryOptions());
  },
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Restrolytics" },
      { name: "description", content: "Daily restaurant sales, labor, inventory, and team operations in Restrolytics." },
      { property: "og:title", content: "Dashboard — Restrolytics" },
      { property: "og:description", content: "Daily restaurant sales, labor, inventory, and team operations in Restrolytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DashboardPage() {
  const { data: stats } = useSuspenseQuery(statsQueryOptions());
  const { data: recentSales } = useSuspenseQuery(salesQueryOptions());
  const { data: alerts } = useSuspenseQuery(alertsQueryOptions());
  const { data: chartData } = useSuspenseQuery(chartQueryOptions());
  const { data: platformData } = useSuspenseQuery(platformQueryOptions());

  const chartRows = chartData.points.map((p) => ({ name: p.label, total: p.total }));

  const platformColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <DayReport />

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Orders today"
          value={String(stats.todayOrders)}
          icon={<Package className="h-4 w-4" />}
        />
        <SummaryCard
          title="Low stock items"
          value={String(stats.lowStockCount)}
          icon={<AlertTriangle className="h-4 w-4" />}
          alert={stats.lowStockCount > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales last 7 days</CardTitle>
            <CardDescription>Daily revenue across all platforms.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="chart-enter data-grid h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis
                    tickFormatter={(v) => `$${v}`}
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    cursor={{ fill: "var(--color-muted)" }}
                  />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by platform</CardTitle>
            <CardDescription>Revenue share by channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData.data}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {platformData.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={platformColors[index % platformColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {platformData.data.map((item, index) => (
                <div key={item.platform} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: platformColors[index % platformColors.length] }}
                    />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Latest sales from all channels.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/sales">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.order_number ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={platformBadgeVariant(sale.platform)} className="capitalize">
                        {sale.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sale.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock alerts</CardTitle>
            <CardDescription>Items at or below reorder level.</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low stock items.</p>
            ) : (
              <div className="space-y-4">
                {alerts.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.current_stock} {item.unit} / reorder {item.reorder_level} {item.unit}
                      </p>
                    </div>
                    <Badge variant="destructive">Low</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="mt-6 w-full" asChild>
              <Link to="/inventory">Manage inventory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  alert,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-destructive/50" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={alert ? "text-destructive" : "text-muted-foreground"}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function platformBadgeVariant(platform: string) {
  switch (platform) {
    case "pos":
      return "default";
    case "doordash":
      return "secondary";
    case "ubereats":
      return "outline";
    case "grubhub":
      return "outline";
    default:
      return "secondary";
  }
}
