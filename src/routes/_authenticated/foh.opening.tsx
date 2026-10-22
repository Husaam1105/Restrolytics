import { createFileRoute } from "@tanstack/react-router";
import { ShiftChecklist } from "@/components/shift-checklist";

export const Route = createFileRoute("/_authenticated/foh/opening")({
  component: () => (
    <ShiftChecklist
      area="foh"
      shift="opening"
      title="FOH — Opening tasks"
      description="Front of house setup before the first guest walks in."
    />
  ),
  head: () => ({
    meta: [
      { title: "FOH Opening Tasks — Restaurant CRM" },
      { name: "description", content: "Front of house opening checklist for your restaurant." },
      { property: "og:title", content: "FOH Opening Tasks — Restaurant CRM" },
      {
        property: "og:description",
        content: "Front of house opening checklist for your restaurant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
