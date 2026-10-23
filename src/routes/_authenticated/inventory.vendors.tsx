import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, ExternalLink, Loader2, Plus, RefreshCw } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listVendors, saveVendor, syncVendor } from "@/lib/inventory.functions";
import { InventoryNav } from "@/components/inventory-overview";
import { DAY_LABELS, VENDOR_PRESETS, describeSchedule, formatDate } from "@/lib/vendors";
import { requireManagerRoute } from "@/lib/workspace";
import { PageContainer, PageHeader } from "@/components/page";

export const Route = createFileRoute("/_authenticated/inventory/vendors")({
  beforeLoad: requireManagerRoute,
  component: InventoryPage,
  head: () => ({
    meta: [
      { title: "Vendors · Restrolytics" },
      {
        name: "description",
        content: "Track every vendor, the items you order, quantities, quality and the next order date.",
      },
    ],
  }),
});

const emptyForm = {
  name: "",
  websiteUrl: "",
  portalType: "manual",
  loginUrl: "",
  ordersUrl: "",
  contactEmail: "",
  orderCadenceDays: 7,
  orderDays: [] as number[],
  autoSync: false,
  notes: "",
};

function InventoryPage() {
  const queryClient = useQueryClient();
  const fetchVendors = useServerFn(listVendors);
  const saveVendorFn = useServerFn(saveVendor);
  const syncVendorFn = useServerFn(syncVendor);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({ queryKey: ["vendors"], queryFn: () => fetchVendors() });

  const createVendor = useMutation({
    mutationFn: () => saveVendorFn({ data: form }),
    onSuccess: () => {
      toast.success("Vendor added");
      setOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sync = useMutation({
    mutationFn: (vendorId: string) => syncVendorFn({ data: { vendorId } }),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const vendors = data?.vendors ?? [];

  return (
    <PageContainer>
      <PageHeader
        context="Inventory"
        title="Vendors"
        description="Everyone you buy from, their order days and the items they supply."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Add vendor
          </Button>
        }
      />

      <InventoryNav />

      

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors…
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No vendors yet</CardTitle>
            <CardDescription>
              Add your first vendor to start tracking orders. Suppliers with an online portal can sync automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {VENDOR_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                onClick={() => {
                  setForm({
                    ...emptyForm,
                    name: preset.name,
                    websiteUrl: preset.websiteUrl,
                    portalType: preset.portalType,
                    loginUrl: preset.loginUrl,
                    ordersUrl: preset.ordersUrl,
                    orderCadenceDays: preset.cadenceDays,
                    orderDays: preset.orderDays,
                    autoSync: true,
                  });
                  setOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> {preset.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vendors.map((vendor) => {
            const stat = data?.stats.find((s) => s.vendorId === vendor.id);
            return (
              <Card key={vendor.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{vendor.name}</CardTitle>
                      <CardDescription>
                        {describeSchedule(vendor).replace(/^orders/, "Orders")}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        vendor.sync_status === "connected"
                          ? "default"
                          : vendor.sync_status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {vendor.sync_status === "connected"
                        ? "Auto-sync on"
                        : vendor.sync_status === "error"
                          ? "Sync error"
                          : "Manual"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Boxes className="h-4 w-4" /> {stat?.itemCount ?? 0} items
                    </span>
                    {(stat?.lowStock ?? 0) > 0 && (
                      <span className="text-destructive">{stat?.lowStock} to reorder</span>
                    )}
                  </div>
                  <p className="text-muted-foreground">Last synced: {formatDate(vendor.last_synced_at)}</p>
                  {vendor.last_error && <p className="text-xs text-destructive">{vendor.last_error}</p>}
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button asChild size="sm">
                      <Link to="/inventory/$vendorId" params={{ vendorId: vendor.id }}>
                        Open page
                      </Link>
                    </Button>
                    {vendor.portal_type === "woocommerce" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sync.isPending}
                        onClick={() => sync.mutate(vendor.id)}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} /> Sync
                      </Button>
                    )}
                    {vendor.website_url && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={vendor.website_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" /> Site
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
            <DialogDescription>
              For vendors with a WooCommerce customer portal (like Depot Deliveries), orders can be pulled in daily.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name">Vendor name</Label>
              <Input
                id="vendor-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Depot Deliveries"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-site">Website</Label>
              <Input
                id="vendor-site"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://www.depotdeliveries.com"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Pull orders from their website</p>
                <p className="text-xs text-muted-foreground">Checks the portal daily for new orders.</p>
              </div>
              <Switch
                checked={form.portalType === "woocommerce"}
                onCheckedChange={(checked) =>
                  setForm({
                    ...form,
                    portalType: checked ? "woocommerce" : "manual",
                    autoSync: checked,
                  })
                }
              />
            </div>
            {form.portalType === "woocommerce" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-login">Account login page</Label>
                  <Input
                    id="vendor-login"
                    value={form.loginUrl}
                    onChange={(e) => setForm({ ...form, loginUrl: e.target.value })}
                    placeholder="https://www.depotdeliveries.com/my-account/"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-orders">Orders page</Label>
                  <Input
                    id="vendor-orders"
                    value={form.ordersUrl}
                    onChange={(e) => setForm({ ...form, ordersUrl: e.target.value })}
                    placeholder="https://www.depotdeliveries.com/my-account/orders/"
                  />
                </div>
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-cadence">Order every (days)</Label>
                <Input
                  id="vendor-cadence"
                  type="number"
                  min={1}
                  value={form.orderCadenceDays}
                  onChange={(e) => setForm({ ...form, orderCadenceDays: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-email">Contact email</Label>
                <Input
                  id="vendor-email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="orders@vendor.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Order days (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, index) => {
                  const active = form.orderDays.includes(index);
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() =>
                        setForm({
                          ...form,
                          orderDays: active
                            ? form.orderDays.filter((d) => d !== index)
                            : [...form.orderDays, index].sort((a, b) => a - b),
                        })
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Set the days you order (e.g. Monday and Friday). Leave empty to use the day count above.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-notes">Notes</Label>
              <Textarea
                id="vendor-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Delivery days, minimums, rep name…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={createVendor.isPending} onClick={() => createVendor.mutate()}>
              {createVendor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
