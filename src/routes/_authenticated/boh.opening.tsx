import { createFileRoute } from "@tanstack/react-router";
import { ShiftChecklist } from "@/components/shift-checklist";

export const Route = createFileRoute("/_authenticated/boh/opening")({
  component: () => (
    <ShiftChecklist
      area="boh"
      shift="opening"
      title="BOH — Opening tasks"
      description="Kitchen prep, temperatures and equipment start-up."
    />
  ),
  head: () => ({
    meta: [
      { title: "BOH Opening Tasks — Restaurant CRM" },
      { name: "description", content: "Back of house opening checklist for your kitchen." },
      { property: "og:title", content: "BOH Opening Tasks — Restaurant CRM" },
      { property: "og:description", content: "Back of house opening checklist for your kitchen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
