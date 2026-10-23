/**
 * Shared date-range presets for every reporting page (see AGENTS.md).
 *
 * All math is on plain YYYY-MM-DD strings, relative to a `today` that the
 * caller supplies in the restaurant's own timezone (useRestaurantClock), so a
 * manager in another timezone, or a server render, never shifts the day.
 * Weeks start on the restaurant's configured pay-week day (Monday by default).
 */
import { addDays, weekStartDate } from "./payroll";

export type RangeId =
  "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";

export const RANGES: { id: RangeId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "custom", label: "Custom" },
];

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function addMonths(monthFirst: string, months: number) {
  const d = new Date(`${monthFirst}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months, 1);
  return d.toISOString().slice(0, 10);
}

/** Inclusive from/to dates for a preset. "custom" falls back to today. */
export function rangeDates(
  id: string,
  today: string,
  weekStartsOn = 1,
): { from: string; to: string } {
  switch (id) {
    case "yesterday": {
      const d = addDays(today, -1);
      return { from: d, to: d };
    }
    case "this_week":
      return { from: weekStartDate(today, weekStartsOn), to: today };
    case "last_week": {
      const from = addDays(weekStartDate(today, weekStartsOn), -7);
      return { from, to: addDays(from, 6) };
    }
    case "this_month":
      return { from: monthStart(today), to: today };
    case "last_month": {
      const from = addMonths(monthStart(today), -1);
      return { from, to: addDays(monthStart(today), -1) };
    }
    default:
      return { from: today, to: today };
  }
}
