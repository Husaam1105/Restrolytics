/** Shared date-range presets. Weeks run Monday to Sunday (see AGENTS.md). */
export const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "custom", label: "Custom" },
];

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function rangeDates(id: string): { from: string; to: string } {
  const today = new Date();
  const t = fmtDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  switch (id) {
    case "today":
      return { from: t, to: t };
    case "yesterday":
      return { from: fmtDate(yesterday), to: fmtDate(yesterday) };
    case "this_week":
      return { from: fmtDate(weekStart), to: t };
    case "last_week":
      return { from: fmtDate(lastWeekStart), to: fmtDate(lastWeekEnd) };
    case "this_month":
      return { from: fmtDate(monthStart), to: t };
    case "last_month":
      return { from: fmtDate(lastMonthStart), to: fmtDate(lastMonthEnd) };
    default:
      return { from: t, to: t };
  }
}
