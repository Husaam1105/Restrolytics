import { createFileRoute } from "@tanstack/react-router";
import { ShiftChecklist } from "@/components/shift-checklist";

export const Route = createFileRoute("/_authenticated/boh/closing")({
  component: () => (
    <ShiftChecklist
      area="boh"
      shift="closing"
      title="Kitchen closing"
      description="Line breakdown, storage, cleaning and temperature logs."
    />
  ),
  head: () => ({
    meta: [
      { title: "Kitchen closing checklist · Restrolytics" },
      { name: "description", content: "Back of house closing checklist for your kitchen." },
    ],
  }),
});
