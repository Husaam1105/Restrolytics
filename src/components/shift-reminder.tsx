import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { getShiftProgress } from "@/lib/shift-tasks.functions";
import { formatTime } from "@/lib/operating-day";
import { Button } from "@/components/ui/button";

const labels: Record<string, string> = {
  "foh-opening": "FOH opening",
  "foh-closing": "FOH closing",
  "boh-opening": "BOH opening",
  "boh-closing": "BOH closing",
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
      g.area === data.myArea &&
      (data.phase === "closed" ? true : g.shift === "opening" || data.phase === "open"),
  );
  const pending = relevant.filter((g) => g.completed < g.total);

  if (pending.length === 0) {
    return (
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        All checklists are done for today. They reset after closing at{" "}
        {formatTime(data.settings.closeTime)}.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <span className="font-medium">
        {data.phase === "before-open"
          ? `Doors open at ${formatTime(data.settings.openTime)} — finish opening tasks:`
          : data.phase === "closed"
            ? "Service is over — close out the checklists:"
            : "Tasks still open for today:"}
      </span>
      {pending.map((g) => (
        <Button key={`${g.area}-${g.shift}`} asChild variant="outline" size="sm" className="h-7">
          <Link to={`/${g.area}/${g.shift}` as string}>
            {labels[`${g.area}-${g.shift}`]} {g.completed}/{g.total}
          </Link>
        </Button>
      ))}
    </div>
  );
}
