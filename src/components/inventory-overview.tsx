import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  DollarSign,
  Plus,
  Truck,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getStorageOverview, saveLocation, startCount } from "@/lib/storage.functions";

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function InventoryNav() {
  const tabs = [
    { to: "/inventory", label: "Overview", exact: true },
    { to: "/inventory/vendors", label: "Vendors", exact: false },
    { to: "/inventory/storage", label: "Storage areas", exact: false },
  ] as const;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          activeOptions={{ exact: t.exact }}
          className="whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          activeProps={{ className: "border-primary font-medium text-foreground" }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function InventoryOverview({
  vendors,
  section,
}: {
  vendors: { id: string; name: string }[];
  section: "dashboard" | "storage";
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchOverview = useServerFn(getStorageOverview);
  const saveLoc = useServerFn(saveLocation);
  const start = useServerFn(startCount);
  const [newName, setNewName] = useState("");
  const { data } = useQuery({ queryKey: ["storage-overview"], queryFn: () => fetchOverview() });

  const addLoc = useMutation({
    mutationFn: () =>
      saveLoc({ data: { name: newName, sortOrder: (data?.locations.length ?? 0) + 1 } }),
    onSuccess: () => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["storage-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const begin = useMutation({
    mutationFn: () => start({ data: { locationId: null } }),
    onSuccess: (row) => navigate({ to: "/inventory/count/$countId", params: { countId: row.id } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];
  const value = items.reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_per_unit), 0);
  const low = items.filter((i) => Number(i.current_stock) <= Number(i.reorder_level));
  const vendorName = (id: string | null) => vendors.find((v) => v.id === id)?.name ?? "No vendor";
  const locName = (id: string | null) =>
    data?.locations.find((l) => l.id === id)?.name ?? "All locations";
  const placed = new Set((data?.links ?? []).map((l) => l.inventory_item_id));
  const unplaced = items.filter((i) => !placed.has(i.id)).length;

  const kpis = [
    { label: "Items tracked", value: items.length.toString(), icon: Boxes },
    { label: "Stock value", value: money(value), icon: DollarSign },
    { label: "Need reorder", value: low.length.toString(), icon: AlertTriangle },
    { label: "Vendors", value: vendors.length.toString(), icon: Truck },
  ];
  const locationChart = (data?.locations ?? []).map((location) => {
    const ids = new Set(
      (data?.links ?? [])
        .filter((link) => link.location_id === location.id)
        .map((link) => link.inventory_item_id),
    );
    const own = items.filter((item) => ids.has(item.id));
    return {
      name: location.name,
      value: own.reduce(
        (sum, item) => sum + Number(item.current_stock) * Number(item.cost_per_unit),
        0,
      ),
    };
  });

  if (section === "storage") {
    return (
      <div className="space-y-6">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Storage locations</h2>
              <p className="text-xs text-muted-foreground">
                Where items are kept, in shelf order for counting.
                {unplaced > 0 && ` ${unplaced} items not placed in any location yet.`}
              </p>
            </div>
            <Button onClick={() => begin.mutate()} disabled={begin.isPending}>
              <ClipboardList className="mr-2 h-4 w-4" /> Count all locations
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(data?.locations ?? []).map((loc) => {
              const ids = new Set(
                data!.links.filter((l) => l.location_id === loc.id).map((l) => l.inventory_item_id),
              );
              const own = items.filter((i) => ids.has(i.id));
              const last = data!.counts.find(
                (c) => c.status === "completed" && (c.location_id === loc.id || !c.location_id),
              );
              return (
                <Link
                  key={loc.id}
                  to="/inventory/storage/$locationId"
                  params={{ locationId: loc.id }}
                  className="rounded-lg border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Warehouse className="h-4 w-4 text-primary" /> {loc.name}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {own.length} items,{" "}
                    {money(
                      own.reduce(
                        (s, i) => s + Number(i.current_stock) * Number(i.cost_per_unit),
                        0,
                      ),
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last counted:{" "}
                    {last?.completed_at
                      ? new Date(last.completed_at).toLocaleDateString()
                      : "never"}
                  </p>
                </Link>
              );
            })}
            <form
              className="flex gap-2 rounded-lg border border-dashed p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) addLoc.mutate();
              }}
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New location, e.g. Bar fridge"
              />
              <Button
                type="submit"
                size="icon"
                variant="outline"
                disabled={addLoc.isPending}
                aria-label="Add location"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-border lg:grid-cols-4 lg:gap-px">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-accent p-2">
                <k.icon className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-semibold">{k.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => begin.mutate()} disabled={begin.isPending}>
          <ClipboardList className="mr-2 h-4 w-4" /> Count all locations
        </Button>
        <Button variant="outline" asChild>
          <Link to="/inventory/vendors">
            <Truck className="mr-2 h-4 w-4" /> Vendors
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/inventory/storage">
            <Warehouse className="mr-2 h-4 w-4" /> Storage areas
          </Link>
        </Button>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-surface-subtle/60">
          <CardTitle className="text-base">Stock value by storage area</CardTitle>
          <CardDescription>See where the value of your inventory is concentrated.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="chart-enter h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationChart} margin={{ left: -10, right: 8 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  cursor={{ fill: "var(--color-muted)" }}
                />
                <Bar dataKey="value" fill="var(--color-chart-1)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reorder soon</CardTitle>
            <CardDescription>At or below the reorder point</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {low.length === 0 && <p className="text-muted-foreground">Everything is stocked.</p>}
            {low.slice(0, 6).map((i) => (
              <div key={i.id} className="flex justify-between gap-2 border-b pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{vendorName(i.vendor_id)}</p>
                </div>
                <span className="shrink-0 text-destructive">
                  {Number(i.current_stock)} {i.unit}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Count history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data?.counts ?? []).length === 0 && (
              <p className="text-muted-foreground">No counts yet.</p>
            )}
            {(data?.counts ?? []).slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to="/inventory/count/$countId"
                params={{ countId: c.id }}
                className="flex justify-between gap-2 border-b pb-2 last:border-0 hover:text-primary"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{locName(c.location_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.completed_at ?? c.created_at).toLocaleDateString()}
                    {c.counted_by_email ? `, by ${c.counted_by_email.split("@")[0]}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p>{money(Number(c.total_value))}</p>
                  <Badge variant={c.status === "completed" ? "secondary" : "outline"}>
                    {c.status === "completed" ? "Done" : "Draft"}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
