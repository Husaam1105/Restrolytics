import { createFileRoute } from "@tanstack/react-router";
import { TimeclockPanel } from "@/components/timeclock-panel";

export const Route = createFileRoute("/_authenticated/timeclock")({
  component: TimeclockPanel,
  head: () => ({ meta: [
    { title: "My hours & pay · Restrolytics" },
    { name: "description", content: "Clock in, review work hours, and confirm restaurant payroll." },
  ] }),
});
