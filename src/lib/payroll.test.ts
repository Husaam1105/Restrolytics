import { describe, expect, it } from "vitest";

import {
  addDays,
  formatDayLabel,
  hoursToMinutes,
  minutesToHours,
  money,
  parsePayrollSettings,
  weekDays,
  weekStartDate,
} from "./payroll";

describe("pay weeks", () => {
  it("finds the Monday that starts the week", () => {
    expect(weekStartDate("2026-10-23")).toBe("2026-10-19"); // Friday
    expect(weekStartDate("2026-10-19")).toBe("2026-10-19"); // Monday itself
    expect(weekStartDate("2026-10-25")).toBe("2026-10-19"); // Sunday
  });

  it("respects a Sunday week start", () => {
    expect(weekStartDate("2026-10-23", 0)).toBe("2026-10-18");
    expect(weekStartDate("2026-10-18", 0)).toBe("2026-10-18");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(weekDays("2026-12-28")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });

  it("reads the week start from settings and rejects junk", () => {
    expect(parsePayrollSettings({ payroll: { weekStartsOn: 0 } })).toEqual({ weekStartsOn: 0 });
    expect(parsePayrollSettings({ payroll: { weekStartsOn: 9 } })).toEqual({ weekStartsOn: 1 });
    expect(parsePayrollSettings(undefined)).toEqual({ weekStartsOn: 1 });
  });
});

describe("hours and money", () => {
  it("round-trips hours and minutes", () => {
    expect(minutesToHours(450)).toBe(7.5);
    expect(minutesToHours(100)).toBe(1.67);
    expect(hoursToMinutes(7.5)).toBe(450);
    expect(hoursToMinutes(-2)).toBe(0);
  });

  it("formats money to cents", () => {
    expect(money(12)).toBe("$12.00");
    expect(money(0.105)).toBe("$0.11");
  });

  it("labels days", () => {
    expect(formatDayLabel("2026-10-23")).toBe("Fri 10/23");
  });
});
