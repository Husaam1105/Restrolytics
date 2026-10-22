import { createFileRoute } from "@tanstack/react-router";
import { TimeclockPanel } from "@/components/timeclock-panel";

export const Route = createFileRoute("/_authenticated/timeclock")({
  component: TimeclockPanel,
  head: () => ({ meta: [
    { title: "My hours & pay — Restaurant CRM" },
    { name: "description", content: "Clock in, review work hours, and confirm restaurant payroll." },
    { property: "og:title", content: "My hours & pay — Restaurant CRM" },
    { property: "og:description", content: "Clock in, review work hours, and confirm restaurant payroll." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});
