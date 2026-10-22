import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, ClipboardList, Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteLocation, getStorageOverview, saveLocation, setLocationItems, startCount } from "@/lib/storage.functions";
import { listVendors } from "@/lib/inventory.functions";

export const Route = createFileRoute("/_authenticated/inventory/storage/$locationId")({
  component: LocationPage,
  head: () => ({
    meta: [
      { title: "Storage Location — Restrolytics Inventory" },
      { name: "description", content: "Items kept in this storage location in shelf order, with counts and value." },
      { property: "og:title", content: "Storage Location — Restrolytics Inventory" },
      { property: "og:description", content: "Items kept in this storage location in shelf order, with counts and value." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LocationPage() {
  const { locationId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchOverview = useServerFn(getStorageOverview);
  const fetchVendors = useServerFn(listVendors);
  const setItems = useServerFn(setLocationItems);
  const saveLoc = useServerFn(saveLocation);
  const delLoc = useServerFn(deleteLocation);
  const start = useServerFn(startCount);
  const { data, isLoading } = useQuery({ queryKey: ["storage-overview"], queryFn: () => fetchOverview() });
  const { data: vdata } = useQuery({ queryKey: ["vendors"], queryFn: () => fetchVendors() });

  const [pickOpen, setPickOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState("");

  const loc = data?.locations.find((l) => l.id === locationId);
  const links = (data?.links ?? []).filter((l) => l.location_id === locationId).sort((a, b) => a.sort_order - b.sort_order);
  const itemMap = new Map((data?.items ?? []).map((i) => [i.id, i]));
  const rows = links.map((l) => itemMap.get(l.inventory_item_id)).filter(Boolean) as NonNullable<ReturnType<typeof itemMap.get>>[];
  const vendorName = (id: string | null) => vdata?.vendors.find((v) => v.id === id)?.name ?? "—";
  const lastCount = data?.counts.find((c) => c.status === "completed" && (c.location_id === locationId || !c.location_id));

  const refresh = () => qc.invalidateQueries({ queryKey: ["storage-overview"] });
  const save = useMutation({
    mutationFn: (ids: string[]) => setItems({ data: { locationId, itemIds: ids } }),
    onSuccess: () => {
      setPickOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: () => saveLoc({ data: { id: locationId, name, sortOrder: loc?.sort_order ?? 0 } }),
    onSuccess: () => {
      setRenameOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => delLoc({ data: { id: locationId } }),
    onSuccess: () => {
      refresh();
      navigate({ to: "/inventory" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const begin = useMutation({
    mutationFn: () => start({ data: { locationId } }),
    onSuccess: (row) => navigate({ to: "/inventory/count/$countId", params: { countId: row.id } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const move = (index: number, dir: -1 | 1) => {
    const ids = rows.map((r) => r.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    const t = ids[index]!;
    ids[index] = ids[j]!;
    ids[j] = t;
    save.mutate(ids);
  };

  if (isLoading) return <Loader2 className="m-6 h-5 w-5 animate-spin text-muted-foreground" />;
  if (!loc) return <p className="p-6 text-sm text-muted-foreground">Location not found.</p>;

  const value = rows.reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_per_unit), 0);
  const filtered = (data?.items ?? []).filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/inventory/storage" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Storage areas
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{loc.name}</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} items · ${value.toFixed(2)} on hand · Last counted{" "}
            {lastCount?.completed_at ? new Date(lastCount.completed_at).toLocaleDateString() : "never"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => begin.mutate()} disabled={begin.isPending || rows.length === 0}>
            <ClipboardList className="mr-2 h-4 w-4" /> Count this location
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPicked(rows.map((r) => r.id));
              setSearch("");
              setPickOpen(true);
            }}
          >
            Add / remove items
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rename location"
            onClick={() => {
              setName(loc.name);
              setRenameOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete location"
            onClick={() => confirm(`Delete ${loc.name}? Items stay in inventory.`) && remove.mutate()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Shelf</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Par</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No items here yet. Use "Add / remove items".
                  </TableCell>
                </TableRow>
              )}
              {rows.map((i, index) => {
                const low = Number(i.current_stock) <= Number(i.reorder_level);
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="flex">
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Move up" onClick={() => move(index, -1)}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Move down" onClick={() => move(index, 1)}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>
                      {i.vendor_id ? (
                        <Link to="/inventory/$vendorId" params={{ vendorId: i.vendor_id }} className="hover:underline">
                          {vendorName(i.vendor_id)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(i.current_stock)} {i.unit}
                      {low && <Badge variant="destructive" className="ml-1">Low</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{Number(i.par_level)}</TableCell>
                    <TableCell className="text-right">
                      ${(Number(i.current_stock) * Number(i.cost_per_unit)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Items in {loc.name}</DialogTitle>
            <DialogDescription>An item can be kept in more than one location.</DialogDescription>
          </DialogHeader>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items" />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {filtered.map((i) => (
              <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                <Checkbox
                  checked={picked.includes(i.id)}
                  onCheckedChange={(c) => setPicked(c ? [...picked, i.id] : picked.filter((x) => x !== i.id))}
                />
                <span className="flex-1">{i.name}</span>
                <span className="text-xs text-muted-foreground">{vendorName(i.vendor_id)}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickOpen(false)}>
              Cancel
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate(picked)}>
              Save ({picked.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename location</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button disabled={rename.isPending} onClick={() => rename.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
