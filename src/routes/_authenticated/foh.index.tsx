import { createFileRoute } from "@tanstack/react-router";
import { AreaChecklists } from "@/components/area-checklists";

export const Route = createFileRoute("/_authenticated/foh/")({
  component: () => <AreaChecklists area="foh" />,
  head: () => ({
    meta: [
      { title: "Front of house tasks — Restrolytics" },
      { name: "description", content: "Opening and closing tasks for the front of house team." },
      { property: "og:title", content: "Front of house tasks — Restrolytics" },
      { property: "og:description", content: "Opening and closing tasks for the front of house team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
