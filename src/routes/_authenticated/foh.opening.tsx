import { createFileRoute } from "@tanstack/react-router";
import { ShiftChecklist } from "@/components/shift-checklist";

export const Route = createFileRoute("/_authenticated/foh/opening")({
  component: () => (
    <ShiftChecklist
      area="foh"
      shift="opening"
      title="Front of house opening"
      description="Front of house setup before the first guest walks in."
    />
  ),
  head: () => ({
    meta: [
      { title: "Front of house opening checklist · Restrolytics" },
      { name: "description", content: "Front of house opening checklist for your restaurant." },
    ],
  }),
});
