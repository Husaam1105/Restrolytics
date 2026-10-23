import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { getShiftProgress } from "@/lib/shift-tasks.functions";
import { formatTime } from "@/lib/operating-day";
import { Button } from "@/components/ui/button";

const labels: Record<string, string> = {
  "foh-opening": "Front opening",
  "foh-closing": "Front closing",
  "boh-opening": "Kitchen opening",
  "boh-closing": "Kitchen closing",
};

export function ShiftReminder() {
  const fetchProgress = useServerFn(getShiftProgress);
  const { data } = useQuery({
    queryKey: ["shift-progress"],
    queryFn: () => fetchProgress(),
    refetchInterval: 5 * 60 * 1000,
  });

  // Only staff see the reminder, and only for their own area (FOH or kitchen).
  if (!data || !data.isStaff || !data.myArea) return null;

  const relevant = data.groups.filter(
    (g) =>
      // Staff who work "both" areas are responsible for both sets of lists.
      (data.myArea === "both" || g.area === data.myArea) &&
      (data.phase === "closed" ? true : g.shift === "opening" || data.phase === "open"),
  );
  const pending = relevant.filter((g) => g.completed < g.total);

  if (pending.length === 0) {
    return (
      <div className="flex items-center gap-2 border-b bg-success-soft/60 px-4 py-2 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
        All checklists are done for today. They reset after closing at{" "}
        {formatTime(data.settings.closeTime)}.
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-warning-soft px-4 py-2 text-sm"
    >
      <AlertCircle
        className="size-4 shrink-0 text-warning-foreground dark:text-warning"
        aria-hidden="true"
      />
      <span className="font-medium">
        {data.phase === "before-open"
          ? `Doors open at ${formatTime(data.settings.openTime)}. Finish the opening lists:`
          : data.phase === "closed"
            ? "Service is over. Close out the checklists:"
            : "Tasks still open for today:"}
      </span>
      {pending.map((g) => (
        <Button key={`${g.area}-${g.shift}`} asChild variant="outline" size="sm">
          <Link to={`/${g.area}/${g.shift}` as string}>
            {labels[`${g.area}-${g.shift}`]}{" "}
            <span className="tabular-nums text-muted-foreground">
              {g.completed}/{g.total}
            </span>
          </Link>
        </Button>
      ))}
    </div>
  );
}
