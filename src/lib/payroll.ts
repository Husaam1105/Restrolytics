/**
 * Payroll runs on whole weeks. A week starts on the day chosen in the
 * restaurant's settings (Monday by default) and covers seven days.
 */
export type PayArea = "foh" | "boh" | "both";
export type PoolArea = "foh" | "boh" | "all";
export type PayMethod = "cash" | "check" | "transfer";

export const AREA_LABELS: Record<PayArea, string> = {
  foh: "Front of house",
  boh: "Back of house",
  both: "Both",
};

export const POOL_AREA_LABELS: Record<PoolArea, string> = {
  foh: "Front of house",
  boh: "Back of house",
  all: "Everyone",
};

export const PAY_METHOD_LABELS: Record<PayMethod, string> = {
  cash: "Cash",
  check: "Check",
  transfer: "Zelle / bank transfer",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** First day of the pay week that contains `date`. */
export function weekStartDate(date: string, weekStartsOn = 1) {
  const diff = (weekdayOf(date) - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function weekDays(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function parsePayrollSettings(settings: unknown): { weekStartsOn: number } {
  const s = (settings ?? {}) as Record<string, unknown>;
  const payroll = (s["payroll"] ?? {}) as Record<string, unknown>;
  const raw = Number(payroll["weekStartsOn"]);
  return { weekStartsOn: Number.isInteger(raw) && raw >= 0 && raw <= 6 ? raw : 1 };
}

export function money(value: number) {
  return `$${(Math.round(value * 100) / 100).toFixed(2)}`;
}

export function hoursLabel(hours: number) {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded}h`;
}

export function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

export function hoursToMinutes(hours: number) {
  return Math.max(0, Math.round(hours * 60));
}

export function formatDayLabel(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAY_LABELS[d.getUTCDay()]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function formatDateRange(start: string, end: string) {
  const fmt = (value: string) => {
    const d = new Date(`${value}T00:00:00Z`);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatClockTime(iso: string | null, timezone: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
}
