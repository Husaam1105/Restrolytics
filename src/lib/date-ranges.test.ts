import { describe, expect, it } from "vitest";
import { rangeDates } from "./date-ranges";

// 2026-10-22 is a Thursday.
const TODAY = "2026-10-22";

describe("rangeDates", () => {
  it("handles single days", () => {
    expect(rangeDates("today", TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(rangeDates("yesterday", TODAY)).toEqual({ from: "2026-10-21", to: "2026-10-21" });
  });

  it("starts weeks on Monday by default", () => {
    expect(rangeDates("this_week", TODAY)).toEqual({ from: "2026-10-19", to: TODAY });
    expect(rangeDates("last_week", TODAY)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  it("respects the restaurant's pay-week start", () => {
    // Weeks starting Sunday (0)
    expect(rangeDates("this_week", TODAY, 0)).toEqual({ from: "2026-10-18", to: TODAY });
    expect(rangeDates("last_week", TODAY, 0)).toEqual({ from: "2026-10-11", to: "2026-10-17" });
  });

  it("handles months, including year boundaries", () => {
    expect(rangeDates("this_month", TODAY)).toEqual({ from: "2026-10-01", to: TODAY });
    expect(rangeDates("last_month", TODAY)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(rangeDates("last_month", "2027-01-05")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("falls back to today for unknown ids", () => {
    expect(rangeDates("custom", TODAY)).toEqual({ from: TODAY, to: TODAY });
  });
});
