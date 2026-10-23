import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, Pencil, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteInventoryItem,
  getVendorDetail,
  saveInventoryItem,
  saveVendor,
  saveVendorCredentials,
  syncVendor,
} from "@/lib/inventory.functions";
import { DAY_LABELS, describeSchedule, formatDate, nextOrderDate, orderUrgency, type VendorItem } from "@/lib/vendors";
import { InvoiceCapture } from "@/components/invoice-capture";
import { requireManagerRoute } from "@/lib/workspace";
import { useConfirm } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/inventory/$vendorId")({
  beforeLoad: requireManagerRoute,
  component: VendorPage,
  head: () => ({
    meta: [
      { title: "Vendor · Restrolytics" },
      {
        name: "description",
        content: "Items ordered from this vendor with quantity, quality, last order date and next order date.",
      },
    ],
  }),
});

type ItemForm = {
  id?: string;
  name: string;
  unit: string;
  currentStock: number;
  parLevel: number;
  reorderLevel: number;
  costPerUnit: number;
  qualityRating: number | null;
  reorderIntervalDays: number;
  notes: string;
  storageArea: string;
};

const emptyItem: ItemForm = {
  name: "",
  unit: "case",
  currentStock: 0,
  parLevel: 0,
  reorderLevel: 0,
  costPerUnit: 0,
  qualityRating: null,
  reorderIntervalDays: 7,
  notes: "",
  storageArea: "Dry storage",
};

function VendorPage() {
  const confirm = useConfirm();
  const { vendorId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchDetail = useServerFn(getVendorDetail);
  const saveItemFn = useServerFn(saveInventoryItem);
  const deleteItemFn = useServerFn(deleteInventoryItem);
  const saveCredsFn = useServerFn(saveVendorCredentials);
  const syncVendorFn = useServerFn(syncVendor);
  const saveVendorFn = useServerFn(saveVendor);

  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);
  const [credsOpen, setCredsOpen] = useState(false);
  const [creds, setCreds] = useState({ username: "", password: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => fetchDetail({ data: { vendorId } }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
  };

  const saveItem = useMutation({
    mutationFn: () =>
      saveItemFn({
        data: {
          ...(itemForm.id ? { id: itemForm.id } : {}),
          vendorId,
          name: itemForm.name,
          unit: itemForm.unit,
          currentStock: itemForm.currentStock,
          parLevel: itemForm.parLevel,
          reorderLevel: itemForm.reorderLevel,
          costPerUnit: itemForm.costPerUnit,
          qualityRating: itemForm.qualityRating,
          reorderIntervalDays: itemForm.reorderIntervalDays,
          notes: itemForm.notes,
        },
      }),
    onSuccess: () => {
      toast.success("Item saved");
      setItemOpen(false);
      setItemForm(emptyItem);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => deleteItemFn({ data: { itemId } }),
    onSuccess: () => {
      toast.success("Item removed");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveCreds = useMutation({
    mutationFn: () => saveCredsFn({ data: { vendorId, ...creds } }),
    onSuccess: () => {
      toast.success("Portal login saved");
      setCredsOpen(false);
      setCreds({ username: "", password: "" });
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sync = useMutation({
    mutationFn: () => syncVendorFn({ data: { vendorId } }),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveDays = useMutation({
    mutationFn: (days: number[]) =>
      saveVendorFn({
        data: {
          id: vendorId,
          name: data?.vendor?.name ?? "",
          websiteUrl: data?.vendor?.website_url ?? "",
          portalType: data?.vendor?.portal_type ?? "manual",
          loginUrl: data?.vendor?.login_url ?? "",
          ordersUrl: data?.vendor?.orders_url ?? "",
          contactEmail: data?.vendor?.contact_email ?? "",
          orderCadenceDays: data?.vendor?.order_cadence_days ?? 7,
          orderDays: days,
          autoSync: data?.vendor?.auto_sync ?? false,
          notes: data?.vendor?.notes ?? "",
        },
      }),
    onSuccess: () => {
      toast.success("Order days updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading vendor…
      </div>
    );
  }

  const vendor = data?.vendor;
  const items = (data?.items ?? []) as VendorItem[];
  const orders = data?.orders ?? [];

  if (!vendor) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <p className="text-sm text-muted-foreground">Vendor not found.</p>
      </div>
    );
  }

  const orderDays = vendor.order_days ?? [];
  const dueItems = items.filter((item) => orderUrgency(item, orderDays) !== "ok");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/inventory/vendors">
          <ArrowLeft className="mr-2 h-4 w-4" /> All vendors
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-title">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">
            {vendor.website_url ? (
              <a className="underline" href={vendor.website_url} target="_blank" rel="noreferrer">
                {vendor.website_url.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "Manual vendor"
            )}
            {" · "}
            {describeSchedule(vendor)}
            {" · last synced "}
            {formatDate(vendor.last_synced_at)}
          </p>
          {vendor.last_error && <p className="mt-1 text-xs text-destructive">{vendor.last_error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <InvoiceCapture vendorId={vendorId} vendorName={vendor.name} onSaved={invalidate} />
          {vendor.portal_type === "woocommerce" && (
            <>
              <Button variant="outline" onClick={() => setCredsOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                {data?.hasCredentials ? "Update login" : "Add portal login"}
              </Button>
              <Button variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
                <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} /> Sync now
              </Button>
            </>
          )}
          <Button
            onClick={() => {
              setItemForm({ ...emptyItem, reorderIntervalDays: vendor.order_cadence_days });
              setItemOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order days</CardTitle>
          <CardDescription>Pick the days you place orders with this vendor. Leave all off to use a fixed number of days between orders.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, index) => {
            const active = orderDays.includes(index);
            return (
              <Button
                key={label}
                size="sm"
                variant={active ? "default" : "outline"}
                disabled={saveDays.isPending}
                onClick={() =>
                  saveDays.mutate(
                    active ? orderDays.filter((d) => d !== index) : [...orderDays, index].sort((a, b) => a - b),
                  )
                }
              >
                {label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Items tracked" value={String(items.length)} />
        <StatCard label="Need reordering" value={String(dueItems.length)} />
        <StatCard label="Orders on record" value={String(orders.length)} />
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="orders">Order history</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Items ordered from {vendor.name}</CardTitle>
              <CardDescription>
                Quantity on hand, quality, last order and the date the next order is due.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No items yet. Add one manually or sync the vendor portal to import them.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>On hand</TableHead>
                      <TableHead>Par</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Last ordered</TableHead>
                      <TableHead>Last qty</TableHead>
                      <TableHead>Order by</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const urgency = orderUrgency(item, orderDays);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.name}
                            <span className="block text-xs text-muted-foreground">{item.unit}</span>
                          </TableCell>
                          <TableCell>{Number(item.current_stock)}</TableCell>
                          <TableCell>{Number(item.par_level)}</TableCell>
                          <TableCell>
                            {item.quality_rating ? (
                              <span className="inline-flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-current" /> {item.quality_rating}/5
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(item.last_ordered_at)}</TableCell>
                          <TableCell>{item.last_ordered_quantity ?? "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                urgency === "overdue" ? "destructive" : urgency === "due" ? "default" : "secondary"
                              }
                            >
                              {formatDate(nextOrderDate(item, orderDays))}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">${Number(item.cost_per_unit).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${item.name}`}
                              onClick={() => {
                                setItemForm({
                                  id: item.id,
                                  name: item.name,
                                  unit: item.unit,
                                  currentStock: Number(item.current_stock),
                                  parLevel: Number(item.par_level),
                                  reorderLevel: Number(item.reorder_level),
                                  costPerUnit: Number(item.cost_per_unit),
                                  qualityRating: item.quality_rating,
                                  reorderIntervalDays: item.reorder_interval_days,
                                  notes: item.notes ?? "",
                                  storageArea: item.storage_area ?? "Dry storage",
                                });
                                setItemOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${item.name}`}
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: `Delete ${item.name}?`,
                                    description: "It's removed from inventory, storage areas and future counts. Past invoices keep their lines.",
                                    confirmLabel: "Delete item",
                                    destructive: true,
                                  })
                                ) {
                                  removeItem.mutate(item.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">No orders recorded yet.</CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">Order #{order.external_order_id ?? order.id.slice(0, 8)}</CardTitle>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">{order.source === "portal" ? "Auto-imported" : "Manual"}</Badge>
                      <span className="text-muted-foreground">{formatDate(order.ordered_at)}</span>
                      <span className="font-medium">${Number(order.total).toFixed(2)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {order.vendor_order_items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No line items captured.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {order.vendor_order_items.map((line) => (
                        <li key={line.id} className="flex justify-between gap-4">
                          <span>
                            {line.name} × {Number(line.quantity)}
                          </span>
                          <span className="text-muted-foreground">${Number(line.unit_price).toFixed(2)} ea</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{itemForm.id ? "Edit item" : "Add item"}</DialogTitle>
            <DialogDescription>Track quantity, quality and how often this item is reordered.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-name">Item name</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Roma Tomatoes (25 lb case)"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Unit">
                <Input
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  placeholder="case"
                />
              </Field>
              <Field label="Quantity on hand">
                <Input
                  type="number"
                  value={itemForm.currentStock}
                  onChange={(e) => setItemForm({ ...itemForm, currentStock: Number(e.target.value) })}
                />
              </Field>
              <Field label="Par level">
                <Input
                  type="number"
                  value={itemForm.parLevel}
                  onChange={(e) => setItemForm({ ...itemForm, parLevel: Number(e.target.value) })}
                />
              </Field>
              <Field label="Reorder at">
                <Input
                  type="number"
                  value={itemForm.reorderLevel}
                  onChange={(e) => setItemForm({ ...itemForm, reorderLevel: Number(e.target.value) })}
                />
              </Field>
              <Field label="Unit cost ($)">
                <Input
                  type="number"
                  step="0.01"
                  value={itemForm.costPerUnit}
                  onChange={(e) => setItemForm({ ...itemForm, costPerUnit: Number(e.target.value) })}
                />
              </Field>
              <Field label="Quality (1–5)">
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={itemForm.qualityRating ?? ""}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      qualityRating: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Reorder every (days)">
                <Input
                  type="number"
                  min={1}
                  value={itemForm.reorderIntervalDays}
                  onChange={(e) => setItemForm({ ...itemForm, reorderIntervalDays: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-notes">Notes</Label>
              <Textarea
                id="item-notes"
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                placeholder="Brand preference, quality issues, substitutions…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saveItem.isPending} onClick={() => saveItem.mutate()}>
              {saveItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credsOpen} onOpenChange={setCredsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vendor portal login</DialogTitle>
            <DialogDescription>
              Stored securely on the server and never shown in the browser. Used only to read your order history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="creds-user">Username or email</Label>
              <Input
                id="creds-user"
                value={creds.username}
                onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="creds-pass">Password</Label>
              <Input
                id="creds-pass"
                type="password"
                value={creds.password}
                onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredsOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saveCreds.isPending} onClick={() => saveCreds.mutate()}>
              {saveCreds.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
