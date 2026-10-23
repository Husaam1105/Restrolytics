import { createFileRoute } from "@tanstack/react-router";
import { ShiftChecklist } from "@/components/shift-checklist";

export const Route = createFileRoute("/_authenticated/boh/opening")({
  component: () => (
    <ShiftChecklist
      area="boh"
      shift="opening"
      title="Kitchen opening"
      description="Kitchen prep, temperatures and equipment start-up."
    />
  ),
  head: () => ({
    meta: [
      { title: "Kitchen opening checklist · Restrolytics" },
      { name: "description", content: "Back of house opening checklist for your kitchen." },
    ],
  }),
});
