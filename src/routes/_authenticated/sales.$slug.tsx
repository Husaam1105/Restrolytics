import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { RANGES, rangeDates } from "@/lib/date-ranges";
import { useRestaurantClock } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getChannelInsights, getChannelSales, importPlatformReport } from "@/lib/sales.functions";
import { channelBySlug, money } from "@/lib/sales";
import { ToastSummaryPanel } from "@/components/toast-summary-panel";

export const Route = createFileRoute("/_authenticated/sales/$slug")({
  component: ChannelSales,
  head: ({ params }) => {
    const label = channelBySlug(params.slug)?.label ?? "Sales channel";
    return {
      meta: [
        { title: `${label} sales — Restaurant CRM` },
        { name: "description", content: `Orders, tips and totals for ${label}.` },
        { property: "og:title", content: `${label} sales — Restaurant CRM` },
        { property: "og:description", content: `Orders, tips and totals for ${label}.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
});


function ChannelSales() {
  const { slug } = Route.useParams();
  const fetchChannel = useServerFn(getChannelSales);
  const [preset, setPreset] = useState("this_week");
  const clock = useRestaurantClock();
  const [custom, setCustom] = useState(() => rangeDates("this_week", clock.today, clock.weekStartsOn));
  const range = preset === "custom" ? custom : rangeDates(preset, clock.today, clock.weekStartsOn);

  const { data, isLoading, error } = useQuery({
    queryKey: ["channel-sales", slug, range.from, range.to],
    queryFn: () => fetchChannel({ data: { slug, from: range.from, to: range.to } }),
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel not found</CardTitle>
          <CardDescription>{(error as Error).message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const connected = data?.connection?.status === "connected";
  const hasImports = (data?.totals.orders ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{data?.channel.label ?? "Loading…"}</h2>
          {data ? (
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? "Connected" : "Not connected"}
            </Badge>
          ) : null}
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
                value={custom.from}
                max={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value || c.from }))}
                className="w-auto"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={custom.to}
                min={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value || c.to }))}
                className="w-auto"
              />
            </div>
          ) : null}
        </div>
      </div>

      {slug === "toast" ? <ToastSummaryPanel from={range.from} to={range.to} /> : (<>
      <ReportImport slug={slug} label={data?.channel.label ?? ""} />

      {!connected && !hasImports && data && slug === "toast" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not connected yet</CardTitle>
            <CardDescription>
              Add this account under Settings → Integrations and its orders will fill in here
              automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link to="/settings/integrations">Go to Integrations</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Order total" value={money(data?.totals.gross ?? 0)} hint="What customers paid" />
        <FeesTile
          fees={data?.totals.fees ?? 0}
          promotions={data?.totals.promotions ?? 0}
          breakdown={data?.feeBreakdown ?? []}
          label={data?.channel.label ?? "The platform"}
        />
        <Tile
          label="You actually get"
          value={money(data?.totals.payout ?? 0)}
          hint={`${data?.totals.payoutOrders ?? 0} orders with payout data`}
          highlight
        />
        <Tile
          label="You keep"
          value={
            (data?.totals.gross ?? 0) > 0 && (data?.totals.payoutOrders ?? 0) > 0
              ? `${Math.round(((data?.totals.payout ?? 0) / (data?.totals.gross ?? 1)) * 100)}%`
              : "—"
          }
          hint="Of the order total, after fees"
        />
      </div>

      <Insights slug={slug} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By day</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : `${data?.days_breakdown.length ?? 0} days with orders`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.days_breakdown.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No orders in this period yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.days_breakdown ?? []).map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{day.date}</TableCell>
                    <TableCell className="text-right">{day.orders}</TableCell>
                    <TableCell className="text-right">{money(day.gross)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Individual orders</CardTitle>
          <CardDescription>Most recent first, up to 200 orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.orders.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to show yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Order total</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Promos</TableHead>
                    <TableHead className="text-right">You get</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.orders ?? []).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.orderNumber ?? order.id.slice(0, 8)}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleString("en-US")}</TableCell>
                      <TableCell className="capitalize">{order.status}</TableCell>
                      <TableCell className="text-right">{money(order.total)}</TableCell>
                      <TableCell className="text-right">
                        {order.fees === null ? "—" : money(order.fees)}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.promotions === null ? "—" : money(order.promotions)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {order.payout === null ? "—" : money(order.payout)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </>)}
    </div>
  );
}

function FeesTile({
  fees,
  promotions,
  breakdown,
  label,
}: {
  fees: number;
  promotions: number;
  breakdown: { key: string; label: string; amount: number }[];
  label: string;
}) {
  const total = fees + promotions;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-left">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardHeader className="pb-2">
              <CardDescription>Fees & commission</CardDescription>
              <CardTitle className="text-2xl">{money(fees)}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {promotions > 0 ? `Plus ${money(promotions)} in promotions · ` : ""}Tap for breakdown
              </p>
            </CardHeader>
          </Card>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fees & commission breakdown</DialogTitle>
          <DialogDescription>What {label} charged on these orders.</DialogDescription>
        </DialogHeader>
        {breakdown.length === 0 && promotions === 0 ? (
          <p className="text-sm text-muted-foreground">
            No fee details yet — import a payment details report to see the breakdown.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {breakdown.map((f) => (
              <div key={f.key} className="flex justify-between gap-4 border-b pb-2">
                <span className="text-muted-foreground">{f.label}</span>
                <span>{money(f.amount)}</span>
              </div>
            ))}
            {promotions > 0 ? (
              <div className="flex justify-between gap-4 border-b pb-2">
                <span className="text-muted-foreground">Promotions & offers</span>
                <span>{money(promotions)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 pt-1 font-medium">
              <span>Total taken by {label}</span>
              <span>{money(total)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Tile({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}

function ReportImport({ slug, label }: { slug: string; label: string }) {
  const queryClient = useQueryClient();
  const upload = useServerFn(importPlatformReport);
  const mutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results: string[] = [];
      for (const file of files) {
        try {
          const r = await upload({ data: { slug, text: await file.text() } });
          results.push(r.label);
        } catch (e) {
          toast.error(`${file.name}: ${(e as Error).message}`);
        }
      }
      return results;
    },
    onSuccess: (results) => {
      if (results.length) toast.success(`Imported ${results.join(", ")}`);
      queryClient.invalidateQueries();
    },
  });
  if (slug === "toast") return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import {label} reports</CardTitle>
        <CardDescription>
          Download reports from the {label} merchant site and drop them here: payment details (orders
          and fees), payout summaries, orders with errors, and ratings. Uploading the same file twice
          won't double-count anything.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/50">
          {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {mutation.isPending ? "Reading reports…" : "Choose one or more CSV files"}
          <input
            type="file"
            accept=".csv,text/csv"
            multiple
            className="sr-only"
            disabled={mutation.isPending}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) mutation.mutate(files);
            }}
          />
        </label>
      </CardContent>
    </Card>
  );
}

function Insights({ slug }: { slug: string }) {
  const fetchInsights = useServerFn(getChannelInsights);
  const { data } = useQuery({
    queryKey: ["channel-insights", slug],
    queryFn: () => fetchInsights({ data: { slug } }),
  });
  if (!data || slug === "toast") return null;
  const lowRatings = data.ratings.filter((r) => Number(r.rating_value) <= 3);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payouts</CardTitle>
          <CardDescription>What was actually deposited, after fees, promotions and refunds.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payout reports imported yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payout date</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Promotions</TableHead>
                    <TableHead className="text-right">Other (ads etc.)</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.payout_date ?? "—"}</TableCell>
                      <TableCell className="text-right">{p.order_count}</TableCell>
                      <TableCell className="text-right">{money(Number(p.sales))}</TableCell>
                      <TableCell className="text-right">{money(Number(p.fees))}</TableCell>
                      <TableCell className="text-right">{money(Number(p.promotions))}</TableCell>
                      <TableCell className="text-right">{money(Number(p.other))}</TableCell>
                      <TableCell className="text-right font-medium">{money(Number(p.total_payout))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order errors</CardTitle>
            <CardDescription>Wrong or missing items reported by customers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No errors on file.</p>
            ) : (
              data.issues.map((i) => (
                <div key={i.id} className="border-b pb-2 text-sm last:border-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{i.business_date}</span>
                    <span className="font-medium">{money(Number(i.amount))}</span>
                  </div>
                  <p>{i.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Ratings{data.averageRating !== null ? ` — ${data.averageRating.toFixed(1)} ★ avg` : ""}
            </CardTitle>
            <CardDescription>
              {data.ratingCount} order ratings. Low ratings (3 or below) are listed here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowRatings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low ratings.</p>
            ) : (
              lowRatings.map((r) => (
                <div key={r.id} className="border-b pb-2 text-sm last:border-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {r.rating_date} · #{r.order_id}
                    </span>
                    <span className="font-medium">{Number(r.rating_value)} ★</span>
                  </div>
                  <p>
                    {r.item_name ? `${r.item_name}` : "Whole order"}
                    {r.tags ? ` — ${r.tags}` : ""}
                    {r.comment ? ` — “${r.comment}”` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
