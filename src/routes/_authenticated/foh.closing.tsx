import { createFileRoute } from "@tanstack/react-router";
import { ShiftChecklist } from "@/components/shift-checklist";

export const Route = createFileRoute("/_authenticated/foh/closing")({
  component: () => (
    <ShiftChecklist
      area="foh"
      shift="closing"
      title="Front of house closing"
      description="Front of house shutdown, cash-out and cleaning."
    />
  ),
  head: () => ({
    meta: [
      { title: "Front of house closing checklist · Restrolytics" },
      { name: "description", content: "Front of house closing checklist for your restaurant." },
    ],
  }),
});
