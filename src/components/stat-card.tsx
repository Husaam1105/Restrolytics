import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One key number. The value is set like a ticket total: condensed, heavy,
 * tabular. `tone` only colours the note, always alongside words.
 * `variant="ticket"` prints it on a highlighter-yellow close-out ticket; use it
 * for the single most important number on a page, never more than one.
 */
export function StatCard({
  label,
  value,
  note,
  tone = "default",
  icon,
  variant = "card",
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "default" | "positive" | "warning" | "negative";
  icon?: ReactNode;
  variant?: "card" | "ticket";
  className?: string;
}) {
  const ticket = variant === "ticket";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-5",
        ticket ? "ticket-paper rounded-t-xl bg-highlight pb-7 text-brand-foreground" : "surface",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 text-sm font-medium",
          ticket ? "text-brand-foreground/75" : "text-muted-foreground",
        )}
      >
        <span>{label}</span>
        {icon ? (
          <span className="[&_svg]:size-4" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="text-figure text-[2rem]">{value}</div>
      {note ? (
        <p
          className={cn(
            "text-sm",
            ticket && "font-medium text-brand-foreground",
            !ticket && tone === "default" && "text-muted-foreground",
            !ticket && tone === "positive" && "text-success",
            !ticket && tone === "warning" && "text-warning-foreground dark:text-warning",
            !ticket && tone === "negative" && "text-destructive",
          )}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
