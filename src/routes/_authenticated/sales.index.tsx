import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChevronRight, ConciergeBell, HandCoins, Receipt, UtensilsCrossed } from "lucide-react";

import { SectionHeader } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getSalesOverview } from "@/lib/sales.functions";
import { money } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/sales/")({
  component: SalesOverview,
  head: () => ({
    meta: [
      { title: "Sales overview · Restrolytics" },
      {
        name: "description",
        content:
          "Total sales with a breakdown by Toast POS, Uber Eats, DoorDash, Grubhub and catering.",
      },
    ],
  }),
});

// Rolling windows for "how are we trending". Calendar periods (this week,
// last month…) live on each channel page via the shared date presets.
const WINDOWS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

const chartConfig = {
  gross: { label: "Sales", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

function SalesOverview() {
  const fetchOverview = useServerFn(getSalesOverview);
  const [days, setDays] = useState(30);
  const query = useQuery({
    queryKey: ["sales-overview", days],
    queryFn: () => fetchOverview({ data: { days } }),
  });
  const data = query.data;
  const total = data?.totals.grossWithCatering ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Period">
        {WINDOWS.map((w) => (
          <Button
            key={w.days}
            size="sm"
            aria-pressed={days === w.days}
            variant={days === w.days ? "default" : "outline"}
            onClick={() => setDays(w.days)}
          >
            {w.label}
          </Button>
        ))}
      </div>

      {query.isError ? (
        <ErrorState
          title="Sales didn't load"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : !data ? (
        <LoadingState rows={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total sales"
              value={money(total)}
              icon={<Receipt />}
              note="All channels, including catering"
            />
            <StatCard
              label="Orders"
              value={data.totals.orders.toLocaleString("en-US")}
              icon={<ConciergeBell />}
              note="POS and delivery"
            />
            <StatCard
              label="Tips"
              value={money(data.totals.tips)}
              icon={<HandCoins />}
              note="Across channels"
            />
            <StatCard
              label="Catering"
              value={money(data.catering.gross)}
              icon={<UtensilsCrossed />}
              note={`${data.catering.orders} event${data.catering.orders === 1 ? "" : "s"}`}
            />
          </div>

          <section className="surface p-5 sm:p-6" aria-labelledby="by-channel-chart">
            <SectionHeader
              title={<span id="by-channel-chart">Sales by channel</span>}
              description={`${data.from} to ${data.to}`}
            />
            <div className="mt-5">
              {total === 0 ? (
                <EmptyState
                  title="No sales in this period"
                  description="Upload a Toast sales summary or an Uber Eats report from a channel's page."
                />
              ) : (
                <ChartContainer config={chartConfig} className="chart-enter h-72 w-full">
                  <BarChart
                    data={[...data.channels, { label: "Catering", gross: data.catering.gross }]}
                    margin={{ left: 4, right: 4, top: 4 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
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
                      content={<ChartTooltipContent formatter={(v) => money(Number(v))} />}
                    />
                    <Bar
                      dataKey="gross"
                      fill="var(--color-gross)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={56}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          </section>

          <section className="surface overflow-hidden" aria-labelledby="channel-list">
            <div className="p-5 pb-2 sm:p-6 sm:pb-2">
              <SectionHeader
                title={<span id="channel-list">Channels</span>}
                description="Open a channel to see its orders, fees and payouts."
              />
            </div>
            <ul className="divide-y">
              {data.channels.map((channel) => {
                const share = total > 0 ? Math.round((channel.gross / total) * 100) : 0;
                const detail = [
                  `${channel.orders.toLocaleString("en-US")} orders`,
                  `${money(channel.tips)} in tips`,
                  channel.failed > 0 ? `${channel.failed} cancelled or refunded` : null,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <li key={channel.slug}>
                    <Link
                      to="/sales/$slug"
                      params={{ slug: channel.slug }}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/60 sm:px-6"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {channel.label}
                          {channel.connected ? <Badge variant="success">Connected</Badge> : null}
                        </p>
                        <p className="text-sm text-muted-foreground">{detail}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-right">
                        <div>
                          <p className="font-semibold tabular-nums">{money(channel.gross)}</p>
                          <p className="text-sm text-muted-foreground">{share}% of sales</p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  to="/sales/catering"
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/60 sm:px-6"
                >
                  <div>
                    <p className="font-semibold">Catering</p>
                    <p className="text-sm text-muted-foreground">
                      {data.catering.orders} event{data.catering.orders === 1 ? "" : "s"} in this
                      period
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <div>
                      <p className="font-semibold tabular-nums">{money(data.catering.gross)}</p>
                      <p className="text-sm text-muted-foreground">
                        {total > 0 ? Math.round((data.catering.gross / total) * 100) : 0}% of sales
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
