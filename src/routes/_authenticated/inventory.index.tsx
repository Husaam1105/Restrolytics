import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVendors } from "@/lib/inventory.functions";
import { InventoryNav, InventoryOverview } from "@/components/inventory-overview";
import { PageContainer, PageHeader } from "@/components/page";

const meta = "Stock value, what to reorder and recent counts across every vendor and storage area.";
export const Route = createFileRoute("/_authenticated/inventory/")({
  component: InventoryDashboard,
  head: () => ({
    meta: [{ title: "Inventory dashboard · Restrolytics" }, { name: "description", content: meta }],
  }),
});

function InventoryDashboard() {
  const fetchVendors = useServerFn(listVendors);
  const { data } = useQuery({ queryKey: ["vendors"], queryFn: () => fetchVendors() });
  return (
    <PageContainer>
      <PageHeader title="Inventory" description={meta} />
      <InventoryNav />
      <InventoryOverview vendors={data?.vendors ?? []} section="dashboard" />
    </PageContainer>
  );
}
