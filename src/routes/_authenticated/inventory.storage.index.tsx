import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVendors } from "@/lib/inventory.functions";
import { InventoryNav, InventoryOverview } from "@/components/inventory-overview";

const meta = "Walk-in, freezer, racks and fridges — what is kept where, in shelf order for counting.";
export const Route = createFileRoute("/_authenticated/inventory/storage/")({
  component: StorageAreasPage,
  head: () => ({
    meta: [
      { title: "Storage areas — Restrolytics Inventory" },
      { name: "description", content: meta },
      { property: "og:title", content: "Storage areas — Restrolytics Inventory" },
      { property: "og:description", content: meta },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function StorageAreasPage() {
  const fetchVendors = useServerFn(listVendors);
  const { data } = useQuery({ queryKey: ["vendors"], queryFn: () => fetchVendors() });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Storage areas</h1>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </div>
      <InventoryNav />
      <InventoryOverview vendors={data?.vendors ?? []} section="storage" />
    </div>
  );
}
