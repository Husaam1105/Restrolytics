import { createFileRoute } from "@tanstack/react-router";
import { ShiftChecklist } from "@/components/shift-checklist";

export const Route = createFileRoute("/_authenticated/foh/closing")({
  component: () => (
    <ShiftChecklist
      area="foh"
      shift="closing"
      title="FOH — Closing tasks"
      description="Front of house shutdown, cash-out and cleaning."
    />
  ),
  head: () => ({
    meta: [
      { title: "FOH Closing Tasks — Restaurant CRM" },
      { name: "description", content: "Front of house closing checklist for your restaurant." },
      { property: "og:title", content: "FOH Closing Tasks — Restaurant CRM" },
      {
        property: "og:description",
        content: "Front of house closing checklist for your restaurant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
