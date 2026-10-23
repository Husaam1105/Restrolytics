import { createFileRoute } from "@tanstack/react-router";
import { AreaChecklists } from "@/components/area-checklists";

export const Route = createFileRoute("/_authenticated/boh/")({
  component: () => <AreaChecklists area="boh" />,
  head: () => ({
    meta: [
      { title: "Kitchen staff tasks · Restrolytics" },
      { name: "description", content: "Opening and closing tasks for the kitchen team." },
    ],
  }),
});
