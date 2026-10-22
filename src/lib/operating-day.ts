/**
 * The "operating day" is the restaurant's own business day, not the UTC calendar day.
 * Checklists reset once the day is closed out, so a shift that runs past midnight
 * (e.g. open 11:00, close 01:00) keeps working on the same checklist until closing.
 */
export type ShiftSettings = {
  timezone: string;
  openTime: string; // "HH:MM" local
  closeTime: string; // "HH:MM" local
};

export const DEFAULT_SHIFT_SETTINGS: ShiftSettings = {
  timezone: "America/New_York",
  openTime: "11:00",
  closeTime: "22:00",
};

export function parseShiftSettings(settings: unknown): ShiftSettings {
  const s = (settings ?? {}) as Record<string, unknown>;
  const shift = (s["shift"] ?? {}) as Record<string, unknown>;
  const pick = (key: keyof ShiftSettings) => {
    const v = shift[key];
    return typeof v === "string" && v.trim() ? v.trim() : DEFAULT_SHIFT_SETTINGS[key];
  };
  return {
    timezone: pick("timezone"),
    openTime: normalizeTime(pick("openTime"), DEFAULT_SHIFT_SETTINGS.openTime),
    closeTime: normalizeTime(pick("closeTime"), DEFAULT_SHIFT_SETTINGS.closeTime),
  };
}

export function normalizeTime(value: string, fallback: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return fallback;
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** Local date (YYYY-MM-DD) and minutes-since-midnight for a timezone. */
export function localNow(timezone: string, now: Date = new Date()) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = Number(get("hour")) % 24;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + Number(get("minute")),
  };
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Which business day the checklists belong to right now.
 * Everything resets the moment the closing time passes.
 */
export function operatingDate(settings: ShiftSettings, now: Date = new Date()): string {
  const { date, minutes } = localNow(settings.timezone, now);
  const open = toMinutes(settings.openTime);
  const close = toMinutes(settings.closeTime);
  // Overnight service: minutes before closing still belong to yesterday's day.
  if (close <= open && minutes < close) return shiftDate(date, -1);
  return date;
}

export type ServicePhase = "before-open" | "open" | "closed";

export function servicePhase(settings: ShiftSettings, now: Date = new Date()): ServicePhase {
  const { minutes } = localNow(settings.timezone, now);
  const open = toMinutes(settings.openTime);
  const close = toMinutes(settings.closeTime);
  if (close <= open) {
    if (minutes < close) return "open";
    return minutes >= open ? "open" : "closed";
  }
  if (minutes < open) return "before-open";
  if (minutes < close) return "open";
  return "closed";
}

function zoneOffsetMinutes(timezone: string, at: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    );
    return (asUtc - at.getTime()) / 60000;
  } catch {
    return 0;
  }
}

/** UTC instants that bound a local calendar day in the restaurant's timezone. */
export function dayRangeUtc(date: string, timezone: string) {
  const startNaive = Date.parse(`${date}T00:00:00Z`);
  const endNaive = startNaive + 24 * 60 * 60 * 1000;
  const resolve = (naive: number) => {
    let guess = new Date(naive - zoneOffsetMinutes(timezone, new Date(naive)) * 60000);
    guess = new Date(naive - zoneOffsetMinutes(timezone, guess) * 60000);
    return guess.toISOString();
  };
  return { start: resolve(startNaive), end: resolve(endNaive) };
}

export function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}
