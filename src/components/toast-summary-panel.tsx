import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getToastReports, getToastSummaries, importToastReport, importToastSummary } from "@/lib/sales.functions";
import { money } from "@/lib/sales";
import { ItemOutages } from "@/components/item-outages";
import {
  parseToastProductMix,
  parseToastRemovedItems,
  parseToastSummary,
  type ToastProductMix,
  type ToastRemovedItems,
  type ToastSummary,
} from "@/lib/toast-summary";

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function ToastUpload() {
  const queryClient = useQueryClient();
  const save = useServerFn(importToastSummary);
  const saveReport = useServerFn(importToastReport);
  const mutation = useMutation({
    mutationFn: async (files: File[]) => {
      const XLSX = await import("xlsx");
      const done: string[] = [];
      for (const file of files) {
        try {
          const isCsv = file.name.toLowerCase().endsWith(".csv");
          const wb = isCsv ? XLSX.read(await file.text(), { type: "string", raw: true }) : XLSX.read(await file.arrayBuffer());
          const sheets: Record<string, unknown[][]> = {};
          for (const n of wb.SheetNames) {
            sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n]!, { header: 1, defval: null, raw: !isCsv });
          }
          const first = sheets[wb.SheetNames[0]!] ?? [];
          let label: string;
          let r: { startDate: string; endDate: string };
          if (isCsv && (first[0] ?? []).includes("Removed Date")) {
            r = parseToastRemovedItems(first, file.name);
            await saveReport({ data: { kind: "removed", report: r } });
            label = "removed items";
          } else if (sheets["Items"] && sheets["Menu groups"]) {
            r = parseToastProductMix(sheets, file.name);
            await saveReport({ data: { kind: "pmix", report: r } });
            label = "product mix";
          } else {
            r = parseToastSummary(sheets, file.name);
            await save({ data: { summary: r as ToastSummary } });
            label = "sales summary";
          }
          done.push(`${label} ${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`);
        } catch (e) {
          toast.error(`${file.name}: ${(e as Error).message}`);
        }
      }
      return done;
    },
    onSuccess: (done) => {
      if (done.length) toast.success(`Imported Toast ${done.join(", ")}`);
      queryClient.invalidateQueries({ queryKey: ["toast-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["toast-reports"] });
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import Toast reports</CardTitle>
        <CardDescription>
          Upload Sales summary or Product mix (Excel) and Removed items (CSV) exports from Toast.
          Uploading the same dates again replaces the old numbers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/50">
          {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {mutation.isPending ? "Reading report…" : "Choose one or more .xlsx or .csv files"}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function SummaryView({ s }: { s: ToastSummary }) {
  const dayRows = s.days.map((d) => ({
    name: fmtDate(d.date).replace(/^...,\s*/, ""),
    net: Math.round(d.netSales * 100) / 100,
    orders: d.orders,
  }));
  const diningRows = s.dining.filter((d) => d.netSales > 0 || d.orders > 0);
  const paymentRows = s.payments
    .filter((p) => p.total > 0)
    .map((p) => ({ name: p.type.split(" · ").pop() ?? p.type, total: Math.round(p.total * 100) / 100 }));
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">
        {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
        {s.location ? <span className="ml-2 text-sm font-normal text-muted-foreground">{s.location}</span> : null}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross sales" value={money(s.grossSales)} hint="Before discounts" />
        <Stat label="Discounts" value={`-${money(s.discounts)}`} hint={s.refunds ? `Refunds -${money(s.refunds)}` : "No refunds"} />
        <Stat label="Net sales" value={money(s.netSales)} hint={`+ tax ${money(s.tax)} + tips ${money(s.tips)}`} />
        <Stat label="Orders" value={String(s.orders)} hint={`Avg ${money(s.avgOrder)} per order`} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Sales by day</CardTitle>
          <CardDescription>Net sales and order count per day.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="chart-enter data-grid h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayRows} margin={{ left: -12, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "net" ? [money(value), "Net sales"] : [value, "Orders"]
                  }
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar dataKey="net" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How orders came in</CardTitle>
            <CardDescription>Net sales share by order type.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={diningRows} dataKey="netSales" nameKey="option" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {diningRows.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {diningRows.map((d, i) => (
                <div key={d.option} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {d.option}
                  </span>
                  <span className="text-muted-foreground">{d.orders} ord · <span className="font-medium text-foreground">{money(d.netSales)}</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
            <CardDescription>Total collected per payment type.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="chart-enter h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip formatter={(value: number) => money(value)} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="total" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Discounts, voids & cash</CardTitle>
            <CardDescription>
              {s.voids ? `${s.voids.count} voided orders (${money(s.voids.amount)}). ` : ""}
              {s.cash ? `Cash drawer ${s.cash.overShort >= 0 ? "over" : "short"} ${money(Math.abs(s.cash.overShort))} (expected ${money(s.cash.expected)}, counted ${money(s.cash.actual)}).` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Discount</TableHead><TableHead className="text-right">Used</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {s.discountList.slice(0, 8).map((d) => (
                  <TableRow key={d.name}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell className="text-right">{d.count}</TableCell>
                    <TableCell className="text-right">{money(d.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductMixView({ p }: { p: ToastProductMix }) {
  const [all, setAll] = useState(false);
  const items = all ? p.items : p.items.slice(0, 10);
  const topItems = p.items.slice(0, 10).map((i) => ({ name: i.name, net: Math.round(i.net * 100) / 100 }));
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">
        Product mix · {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Items sold" value={p.totals.qty.toLocaleString()} />
        <Stat label="Item sales" value={money(p.totals.gross)} hint="Before discounts" />
        <Stat label="Item discounts" value={`-${money(p.totals.discounts)}`} hint={`Voids ${money(p.totals.voids)}`} />
        <Stat label="Net item sales" value={money(p.totals.net)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu groups</CardTitle>
            <CardDescription>Net sales share per menu group.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={p.groups} dataKey="net" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {p.groups.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {p.groups.map((g, i) => (
                <div key={g.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {g.name}
                  </span>
                  <span className="text-muted-foreground">{g.qty} sold · <span className="font-medium text-foreground">{money(g.net)}</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 items by sales</CardTitle>
            <CardDescription>Net sales per item.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="chart-enter h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip formatter={(value: number) => money(value)} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="net" fill="var(--color-chart-3)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Best-selling items</CardTitle>
            {p.items.length > 10 ? (
              <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
                {all ? "Show top 10" : `Show all ${p.items.length}`}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Sold</TableHead><TableHead className="text-right">Avg price</TableHead><TableHead className="text-right">Discounts</TableHead><TableHead className="text-right">Net sales</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.name}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-right">{i.qty}</TableCell>
                    <TableCell className="text-right">{money(i.avgPrice)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{i.discounts ? `-${money(i.discounts)}` : "—"}</TableCell>
                    <TableCell className="text-right">{money(i.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RemovedItemsView({ r, from, to }: { r: ToastRemovedItems; from: string; to: string }) {
  const [all, setAll] = useState(false);
  const rows = r.rows.filter((x) => x.date >= from && x.date <= to);
  const amount = rows.reduce((s, x) => s + x.amount, 0);
  const byServer = Object.entries(
    rows.reduce<Record<string, { qty: number; amount: number }>>((acc, x) => {
      const k = x.server || "Unknown";
      acc[k] = { qty: (acc[k]?.qty ?? 0) + x.qty, amount: (acc[k]?.amount ?? 0) + x.amount };
      return acc;
    }, {}),
  ).sort((a, b) => b[1].amount - a[1].amount);
  const byItem = Object.entries(
    rows.reduce<Record<string, { qty: number; amount: number }>>((acc, x) => {
      acc[x.item] = { qty: (acc[x.item]?.qty ?? 0) + x.qty, amount: (acc[x.item]?.amount ?? 0) + x.amount };
      return acc;
    }, {}),
  ).sort((a, b) => b[1].amount - a[1].amount);
  const list = all ? rows : rows.slice(0, 10);
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">
        Removed items · {rows.length} removed, {money(amount)}
        <span className="ml-2 text-sm font-normal text-muted-foreground">from report {fmtDate(r.startDate)} – {fmtDate(r.endDate)}</span>
      </h3>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By server</CardTitle>
            <CardDescription>Value of removed items per server.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="chart-enter h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byServer.map(([name, v]) => ({ name, amount: Math.round(v.amount * 100) / 100, qty: v.qty }))} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "amount" ? [money(value), "Removed value"] : [value, "Items"]
                    }
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar dataKey="amount" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Most removed items</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Times</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {byItem.slice(0, 8).map(([name, v]) => (
                  <TableRow key={name}><TableCell>{name}</TableCell><TableCell className="text-right">{v.qty}</TableCell><TableCell className="text-right">{money(v.amount)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Every removal</CardTitle>
            {rows.length > 10 ? (
              <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
                {all ? "Show fewer" : `Show all ${rows.length}`}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Order</TableHead><TableHead>Server</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((x, i) => (
                  <TableRow key={`${x.at}-${x.order}-${i}`}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{x.at}</TableCell>
                    <TableCell>#{x.order}</TableCell>
                    <TableCell>{x.server}</TableCell>
                    <TableCell>{x.item}</TableCell>
                    <TableCell className="text-right">{x.qty}</TableCell>
                    <TableCell className="text-right">{money(x.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ToastSummaryPanel({ from, to }: { from: string; to: string }) {
  const fetchSummaries = useServerFn(getToastSummaries);
  const { data, isLoading } = useQuery({
    queryKey: ["toast-summaries", from, to],
    queryFn: () => fetchSummaries({ data: { from, to } }),
  });
  const fetchReports = useServerFn(getToastReports);
  const reports = useQuery({
    queryKey: ["toast-reports", from, to],
    queryFn: () => fetchReports({ data: { from, to } }),
  });
  return (
    <div className="space-y-6">
      <ItemOutages platform="toast" from={from} to={to} />
      <ToastUpload />
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : data && data.length ? (
        data.map((s) => <SummaryView key={`${s.startDate}-${s.endDate}`} s={s} />)
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No Toast report for these dates</CardTitle>
            <CardDescription>Pick another date range, or upload the sales summary for this period.</CardDescription>
          </CardHeader>
        </Card>
      )}
      {reports.data?.pmix.map((p) => <ProductMixView key={`${p.startDate}-${p.endDate}`} p={p} />)}
      {reports.data?.removed.map((r) => <RemovedItemsView key={`${r.startDate}-${r.endDate}`} r={r} from={from} to={to} />)}
    </div>
  );
}
