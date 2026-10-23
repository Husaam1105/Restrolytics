import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One key number. The value is set like a ticket total: condensed, heavy,
 * tabular. `tone` only colours the note, always alongside words.
 */
export function StatCard({
  label,
  value,
  note,
  tone = "default",
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "default" | "positive" | "warning" | "negative";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface flex flex-col gap-3 p-5", className)}>
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
        <span>{label}</span>
        {icon ? <span className="[&_svg]:size-4" aria-hidden="true">{icon}</span> : null}
      </div>
      <div className="text-figure text-[2rem]">{value}</div>
      {note ? (
        <p
          className={cn(
            "text-sm",
            tone === "default" && "text-muted-foreground",
            tone === "positive" && "text-success",
            tone === "warning" && "text-warning-foreground dark:text-warning",
            tone === "negative" && "text-destructive",
          )}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
