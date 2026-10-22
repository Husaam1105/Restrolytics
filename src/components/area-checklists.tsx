import { ShiftChecklist } from "@/components/shift-checklist";

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
    <div className={embedded ? "space-y-4" : "mx-auto max-w-7xl space-y-6 px-4 py-6"}>
      {embedded ? null : (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.description}</p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <ShiftChecklist embedded area={area} shift="opening" title="Opening tasks" description={c.opening} />
        <ShiftChecklist embedded area={area} shift="closing" title="Closing tasks" description={c.closing} />
      </div>
    </div>
  );
}
