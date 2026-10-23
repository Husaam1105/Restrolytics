import { describe, expect, it } from "vitest";

import {
  dayRangeUtc,
  formatTime,
  normalizeTime,
  operatingDate,
  parseShiftSettings,
  servicePhase,
} from "./operating-day";

const NY = { timezone: "America/New_York", openTime: "11:00", closeTime: "22:00" };
const LATE = { timezone: "America/New_York", openTime: "17:00", closeTime: "02:00" };

describe("parseShiftSettings", () => {
  it("falls back to defaults for missing or blank values", () => {
    expect(parseShiftSettings(null)).toEqual(NY);
    expect(parseShiftSettings({ shift: { timezone: " ", openTime: "nope" } })).toEqual(NY);
  });

  it("normalises times", () => {
    expect(parseShiftSettings({ shift: { openTime: "7:5" } }).openTime).toBe("11:00");
    expect(parseShiftSettings({ shift: { openTime: "7:05" } }).openTime).toBe("07:05");
    expect(normalizeTime("25:99", "00:00")).toBe("23:59");
  });
});

describe("operatingDate", () => {
  it("uses the local calendar day, not UTC", () => {
    // 01:30 UTC on Mar 11 is 21:30 on Mar 10 in New York (EDT).
    expect(operatingDate(NY, new Date("2026-03-11T01:30:00Z"))).toBe("2026-03-10");
  });

  it("keeps an overnight shift on the previous business day until closing", () => {
    // 01:00 local on Jul 5, before a 02:00 close.
    expect(operatingDate(LATE, new Date("2026-07-05T05:00:00Z"))).toBe("2026-07-04");
    // 03:00 local, after closing: the new day has started.
    expect(operatingDate(LATE, new Date("2026-07-05T07:00:00Z"))).toBe("2026-07-05");
  });
});

describe("servicePhase", () => {
  it("covers a same-day service", () => {
    expect(servicePhase(NY, new Date("2026-07-04T13:00:00Z"))).toBe("before-open"); // 09:00
    expect(servicePhase(NY, new Date("2026-07-04T16:00:00Z"))).toBe("open"); // 12:00
    expect(servicePhase(NY, new Date("2026-07-05T03:00:00Z"))).toBe("closed"); // 23:00
  });

  it("covers an overnight service", () => {
    expect(servicePhase(LATE, new Date("2026-07-05T05:00:00Z"))).toBe("open"); // 01:00
    expect(servicePhase(LATE, new Date("2026-07-04T16:00:00Z"))).toBe("closed"); // 12:00
    expect(servicePhase(LATE, new Date("2026-07-04T22:00:00Z"))).toBe("open"); // 18:00
  });
});

describe("dayRangeUtc", () => {
  it("bounds a local day in UTC", () => {
    expect(dayRangeUtc("2026-07-04", "America/New_York")).toEqual({
      start: "2026-07-04T04:00:00.000Z",
      end: "2026-07-05T04:00:00.000Z",
    });
  });

  it("handles the 23-hour day when clocks go forward", () => {
    const { start, end } = dayRangeUtc("2026-03-08", "America/New_York");
    expect(start).toBe("2026-03-08T05:00:00.000Z");
    expect(end).toBe("2026-03-09T04:00:00.000Z");
  });
});

describe("formatTime", () => {
  it("formats 24-hour times as 12-hour", () => {
    expect(formatTime("00:30")).toBe("12:30 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("22:15")).toBe("10:15 PM");
  });
});
