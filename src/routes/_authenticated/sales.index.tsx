import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

function SalesOverview() {
  const fetchOverview = useServerFn(getSalesOverview);
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["sales-overview", days],
    queryFn: () => fetchOverview({ data: { days } }),
  });

  const total = data?.totals.grossWithCatering ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((range) => (
          <Button
            key={range.days}
            size="sm"
            variant={days === range.days ? "default" : "outline"}
            onClick={() => setDays(range.days)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      <div className="grid overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4 lg:gap-px">
        <Tile label="Total sales" value={money(total)} hint="All channels incl. catering" />
        <Tile label="Orders" value={String(data?.totals.orders ?? 0)} hint="Delivery and POS orders" />
        <Tile label="Tips" value={money(data?.totals.tips ?? 0)} hint="Collected across channels" />
        <Tile
          label="Catering"
          value={money(data?.catering.gross ?? 0)}
          hint={`${data?.catering.orders ?? 0} event${(data?.catering.orders ?? 0) === 1 ? "" : "s"}`}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-surface-subtle/60">
          <CardTitle>Revenue by channel</CardTitle>
          <CardDescription>Compare where sales are coming from in this period.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="chart-enter h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...(data?.channels ?? []), { label: "Catering", gross: data?.catering.gross ?? 0 }]} margin={{ left: -12, right: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value: number) => money(value)} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="gross" fill="var(--color-chart-1)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breakdown by channel</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : "Open a channel to see its individual orders."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.channels ?? []).map((channel) => {
            const share = total > 0 ? (channel.gross / total) * 100 : 0;
            return (
              <Link
                key={channel.slug}
                to="/sales/$slug"
                params={{ slug: channel.slug }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {channel.label}
                    <Badge variant={channel.connected ? "default" : "secondary"}>
                      {channel.connected ? "Connected" : "Not connected"}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {channel.orders} orders · {money(channel.tips)} tips
                    {channel.failed > 0 ? ` · ${channel.failed} cancelled/refunded` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{money(channel.gross)}</p>
                  <p className="text-xs text-muted-foreground">{share.toFixed(0)}% of sales</p>
                </div>
              </Link>
            );
          })}

          <Link
            to="/sales/catering"
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent"
          >
            <div>
              <p className="text-sm font-medium">Catering</p>
              <p className="text-xs text-muted-foreground">
                {data?.catering.orders ?? 0} events booked in this period
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{money(data?.catering.gross ?? 0)}</p>
              <p className="text-xs text-muted-foreground">
                {total > 0 ? (((data?.catering.gross ?? 0) / total) * 100).toFixed(0) : 0}% of sales
              </p>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card p-5">
      <div className="pb-2">
        <CardDescription>{label}</CardDescription>
        <p className="font-display text-2xl font-bold">{value}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-primary" /></div>
      </div>
    </div>
  );
}
