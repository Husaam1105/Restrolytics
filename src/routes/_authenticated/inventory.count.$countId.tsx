import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteCount, getCount, getStorageOverview, saveCount } from "@/lib/storage.functions";
import { useConfirm } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/inventory/count/$countId")({
  component: CountPage,
  head: () => ({
    meta: [
      { title: "Stock count · Restrolytics" },
      {
        name: "description",
        content: "Count items shelf by shelf in each storage location and update on-hand stock.",
      },
    ],
  }),
});

const key = (loc: string, item: string) => `${loc}:${item}`;

function CountPage() {
  const confirm = useConfirm();
  const { countId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchCount = useServerFn(getCount);
  const fetchOverview = useServerFn(getStorageOverview);
  const save = useServerFn(saveCount);
  const del = useServerFn(deleteCount);
  const { data: overview } = useQuery({
    queryKey: ["storage-overview"],
    queryFn: () => fetchOverview(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["count", countId],
    queryFn: () => fetchCount({ data: { countId } }),
  });

  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const l of data.lines)
      next[key(l.location_id, l.inventory_item_id)] = String(Number(l.quantity));
    setQty(next);
    setNote(data.count.note ?? "");
  }, [data]);

  const done = data?.count.status === "completed";
  const locations = (overview?.locations ?? []).filter(
    (l) => !data?.count.location_id || l.id === data.count.location_id,
  );
  const itemMap = new Map((overview?.items ?? []).map((i) => [i.id, i]));
  const sections = locations.map((loc) => ({
    loc,
    items: (overview?.links ?? [])
      .filter((l) => l.location_id === loc.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => itemMap.get(l.inventory_item_id))
      .filter(Boolean) as NonNullable<ReturnType<typeof itemMap.get>>[],
  }));

  const lines = Object.entries(qty)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => {
      const [locationId = "", itemId = ""] = k.split(":");
      return { locationId, itemId, quantity: Number(v) };
    });
  const total = lines.reduce(
    (s, l) => s + l.quantity * Number(itemMap.get(l.itemId)?.cost_per_unit ?? 0),
    0,
  );
  const expected = sections.reduce((s, x) => s + x.items.length, 0);

  const submit = useMutation({
    mutationFn: (complete: boolean) => save({ data: { countId, complete, note, lines } }),
    onSuccess: (_r, complete) => {
      toast.success(complete ? "Count completed. On-hand stock is updated." : "Draft saved");
      qc.invalidateQueries({ queryKey: ["count", countId] });
      qc.invalidateQueries({ queryKey: ["storage-overview"] });
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => del({ data: { countId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage-overview"] });
      navigate({ to: "/inventory" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !overview)
    return <Loader2 className="m-6 h-5 w-5 animate-spin text-muted-foreground" />;
  if (!data) return <p className="p-6 text-sm text-muted-foreground">Count not found.</p>;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <Link
          to="/inventory"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Inventory
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-title">
            {data.count.location_id
              ? `${locations[0]?.name ?? "Location"} count`
              : "Full inventory count"}
          </h1>
          <Badge variant={done ? "secondary" : "outline"}>
            {done ? "Completed" : "In progress"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Started {new Date(data.count.created_at).toLocaleString()} by{" "}
          {data.count.counted_by_email?.split("@")[0] ?? "—"}. Walk each location in shelf order and
          enter what you see. Blank items are skipped.
        </p>
      </div>

      {sections.map(({ loc, items }) => (
        <Card key={loc.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{loc.name}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {items.length === 0 && (
              <p className="px-6 pb-4 text-sm text-muted-foreground">No items assigned here.</p>
            )}
            {items.map((i) => {
              const k = key(loc.id, i.id);
              return (
                <div key={k} className="flex items-center gap-3 px-6 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      On file: {Number(i.current_stock)} {i.unit} at $
                      {Number(i.cost_per_unit).toFixed(2)}/{i.unit}
                    </p>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.25"
                    className="w-24 text-right"
                    disabled={done}
                    value={qty[k] ?? ""}
                    onChange={(e) => setQty({ ...qty, [k]: e.target.value })}
                    aria-label={`${i.name} count in ${loc.name}`}
                  />
                  <span className="w-12 text-xs text-muted-foreground">{i.unit}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Textarea
        disabled={done}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Count notes (optional)"
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">{lines.length}</span>/{expected} counted, worth{" "}
            <span className="font-semibold">${total.toFixed(2)}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete count"
              onClick={async () => {
                if (
                  await confirm({
                    title: "Delete this count?",
                    description:
                      "The counted quantities are discarded. On-hand stock doesn't change.",
                    confirmLabel: "Delete count",
                    destructive: true,
                  })
                )
                  remove.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {!done && (
              <>
                <Button
                  variant="outline"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate(false)}
                >
                  Save draft
                </Button>
                <Button
                  disabled={submit.isPending || lines.length === 0}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Complete this count?",
                        description:
                          "On-hand stock for every counted item is updated, adding up all of its storage areas.",
                        confirmLabel: "Complete count",
                      })
                    )
                      submit.mutate(true);
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Complete count
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
