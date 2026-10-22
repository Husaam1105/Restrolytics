import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addItemOutage, listItemOutages, updateItemOutage } from "@/lib/sales.functions";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const who = (email: string | null) => (email ? email.split("@")[0] : "—");

export function ItemOutages({ platform, from, to }: { platform: string; from: string; to: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listItemOutages);
  const add = useServerFn(addItemOutage);
  const update = useServerFn(updateItemOutage);
  const [item, setItem] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["item-outages", platform, from, to],
    queryFn: () => list({ data: { platform, from, to } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["item-outages"] });
  const addMut = useMutation({
    mutationFn: () => add({ data: { platform, itemName: item, date, note } }),
    onSuccess: () => {
      setItem("");
      setNote("");
      toast.success("Logged as not available");
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const updMut = useMutation({
    mutationFn: (v: { id: string; action: "back" | "delete" }) => update({ data: v }),
    onSuccess: refresh,
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Items not available (86'd)</CardTitle>
        <CardDescription>Log anything you ran out of or turned off, who did it, and why.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            addMut.mutate();
          }}
        >
          <Input placeholder="Item (e.g. Shawarma Bowl)" value={item} onChange={(e) => setItem(e.target.value)} required />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} className="w-auto" />
          <Input placeholder="Note (e.g. out of chicken)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" disabled={addMut.isPending || !item.trim()}>Add</Button>
        </form>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing marked unavailable for these dates.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(`${o.outage_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="font-medium">{o.item_name}</TableCell>
                    <TableCell className="text-muted-foreground">{o.note ?? "—"}</TableCell>
                    <TableCell className="capitalize">{who(o.reported_by_email)}</TableCell>
                    <TableCell>
                      {o.back_at ? (
                        <Badge variant="secondary">Back {new Date(o.back_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Badge>
                      ) : (
                        <Badge variant="destructive">Not available</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {!o.back_at ? (
                        <Button size="sm" variant="outline" onClick={() => updMut.mutate({ id: o.id, action: "back" })}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Back in stock
                        </Button>
                      ) : null}
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => updMut.mutate({ id: o.id, action: "delete" })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
