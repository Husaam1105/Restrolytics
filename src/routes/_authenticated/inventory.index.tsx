import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVendors } from "@/lib/inventory.functions";
import { InventoryNav, InventoryOverview } from "@/components/inventory-overview";

const meta = "Stock value, what to reorder and recent counts across every vendor and storage area.";
export const Route = createFileRoute("/_authenticated/inventory/")({
  component: InventoryDashboard,
  head: () => ({
    meta: [
      { title: "Inventory dashboard — Restrolytics" },
      { name: "description", content: meta },
      { property: "og:title", content: "Inventory dashboard — Restrolytics" },
      { property: "og:description", content: meta },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function InventoryDashboard() {
  const fetchVendors = useServerFn(listVendors);
  const { data } = useQuery({ queryKey: ["vendors"], queryFn: () => fetchVendors() });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="border-b pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-coral">Stock intelligence</p>
        <h1 className="font-display text-3xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </div>
      <InventoryNav />
      <InventoryOverview vendors={data?.vendors ?? []} section="dashboard" />
    </div>
  );
}
