import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVendors } from "@/lib/inventory.functions";
import { InventoryNav, InventoryOverview } from "@/components/inventory-overview";
import { PageContainer, PageHeader } from "@/components/page";

const meta = "What lives in the walk-in, freezer, racks and fridges, listed in shelf order so counting goes fast.";
export const Route = createFileRoute("/_authenticated/inventory/storage/")({
  component: StorageAreasPage,
  head: () => ({
    meta: [
      { title: "Storage areas · Restrolytics" },
      { name: "description", content: meta },
    ],
  }),
});

function StorageAreasPage() {
  const fetchVendors = useServerFn(listVendors);
  const { data } = useQuery({ queryKey: ["vendors"], queryFn: () => fetchVendors() });
  return (
    <PageContainer>
      <PageHeader title="Storage areas" description={meta} />
      <InventoryNav />
      <InventoryOverview vendors={data?.vendors ?? []} section="storage" />
    </PageContainer>
  );
}
