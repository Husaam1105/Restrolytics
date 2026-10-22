/**
 * Staff schedule ranges. Everything is plain YYYY-MM-DD so the restaurant's own
 * calendar day is used, never the browser's timezone.
 */
import { addDays, weekStartDate } from "./payroll";

export type ScheduleRange =
  | "today"
  | "this-week"
  | "this-month"
  | "yesterday"
  | "last-week"
  | "last-month";

export const RANGE_LABELS: Record<ScheduleRange, string> = {
  today: "Today",
  "this-week": "This week",
  "this-month": "This month",
  yesterday: "Yesterday",
  "last-week": "Last week",
  "last-month": "Last month",
};

export const UPCOMING_RANGES: ScheduleRange[] = ["today", "this-week", "this-month"];
export const PAST_RANGES: ScheduleRange[] = ["yesterday", "last-week", "last-month"];

export const SHIFT_LABELS: Record<string, string> = {
  opening: "Opening",
  mid: "Mid",
  closing: "Closing",
  "all-day": "All day",
};

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function addMonths(monthFirst: string, months: number) {
  const d = new Date(`${monthFirst}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months, 1);
  return d.toISOString().slice(0, 10);
}

function monthEnd(monthFirst: string) {
  return addDays(addMonths(monthFirst, 1), -1);
}

/** Start and end dates (inclusive) for a range, relative to `today`. */
export function rangeDates(range: ScheduleRange, today: string, weekStartsOn = 1) {
  switch (range) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const d = addDays(today, -1);
      return { start: d, end: d };
    }
    case "this-week": {
      const start = weekStartDate(today, weekStartsOn);
      return { start, end: addDays(start, 6) };
    }
    case "last-week": {
      const start = addDays(weekStartDate(today, weekStartsOn), -7);
      return { start, end: addDays(start, 6) };
    }
    case "this-month": {
      const start = monthStart(today);
      return { start, end: monthEnd(start) };
    }
    case "last-month": {
      const start = addMonths(monthStart(today), -1);
      return { start, end: monthEnd(start) };
    }
  }
}
