import { ShiftChecklist } from "@/components/shift-checklist";
import { PageHeader } from "@/components/page";

const COPY = {
  foh: {
    title: "Front of house",
    description: "Opening and closing tasks for servers, hosts and bar.",
    opening: "Setup before the first guest walks in.",
    closing: "Reset the floor after the last guest leaves.",
  },
  boh: {
    title: "Kitchen staff",
    description: "Opening and closing tasks for the kitchen team.",
    opening: "Prep, temperatures and line setup.",
    closing: "Breakdown, cleaning and storage.",
  },
} as const;

export function AreaChecklists({ area, embedded = false }: { area: "foh" | "boh"; embedded?: boolean }) {
  const c = COPY[area];
  return (
    <div className={embedded ? "space-y-4" : "mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"}>
      {embedded ? null : <PageHeader context="Checklists" title={c.title} description={c.description} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <ShiftChecklist embedded area={area} shift="opening" title="Opening tasks" description={c.opening} />
        <ShiftChecklist embedded area={area} shift="closing" title="Closing tasks" description={c.closing} />
      </div>
    </div>
  );
}
