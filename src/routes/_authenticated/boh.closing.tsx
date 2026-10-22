import { createFileRoute } from "@tanstack/react-router";
import { ShiftChecklist } from "@/components/shift-checklist";

export const Route = createFileRoute("/_authenticated/boh/closing")({
  component: () => (
    <ShiftChecklist
      area="boh"
      shift="closing"
      title="BOH — Closing tasks"
      description="Line breakdown, storage, cleaning and temperature logs."
    />
  ),
  head: () => ({
    meta: [
      { title: "BOH Closing Tasks — Restaurant CRM" },
      { name: "description", content: "Back of house closing checklist for your kitchen." },
      { property: "og:title", content: "BOH Closing Tasks — Restaurant CRM" },
      { property: "og:description", content: "Back of house closing checklist for your kitchen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
