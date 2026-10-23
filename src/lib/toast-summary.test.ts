import { describe, expect, it } from "vitest";

import { parseToastSummary } from "./toast-summary";

const sheets = {
  "All data": [["Location"], ["-Main Street"]],
  "Net sales summary": [
    ["Gross sales", "Sales discounts", "Sales refunds", "Net sales"],
    ["$1,250.00", -50, -25, 1175],
  ],
  "Revenue summary": [
    ["Tax amount", "Tips", "Total"],
    [94, 180.5, 1449.5],
  ],
  "Service mode summary": [
    ["Service mode", "Total orders", "Total guests", "Avg/Order"],
    ["Dine in", 30, 60, 30],
    ["Total", 45, 80, 26.11],
  ],
  "Sales by day": [
    ["yyyyMMdd", "Net sales", "Total orders", "Total guests"],
    ["20261020", 600, 20, 40],
    ["20261021", 575, 25, 40],
    ["Total", 1175, 45, 80],
  ],
  "Payments summary": [
    ["Payment type", "Payment sub type", "Count", "Amount", "Tips", "Total"],
    ["Credit", "Visa", 30, 900, 150, 1050],
    ["Cash", "", 10, 300, 30.5, 330.5],
    ["Gift card", "", 0, 0, 0, 0],
    ["Total", "", 40, 1200, 180.5, 1380.5],
  ],
  "Check Discounts": [
    ["Discount", "Count", "Amount"],
    ["Staff meal", 3, 15],
    ["Happy hour", 5, 35],
    ["Total", 8, 50],
  ],
};

describe("parseToastSummary", () => {
  it("reads totals, payments, days and discounts", () => {
    const s = parseToastSummary(sheets, "SalesSummary_2026-10-20_2026-10-21.xlsx");
    expect(s.location).toBe("Main Street");
    expect([s.startDate, s.endDate]).toEqual(["2026-10-20", "2026-10-21"]);
    expect(s.grossSales).toBe(1250);
    expect(s.discounts).toBe(50);
    expect(s.refunds).toBe(25);
    expect(s.orders).toBe(45);
    expect(s.days.map((d) => d.date)).toEqual(["2026-10-20", "2026-10-21"]);
    expect(s.payments.map((p) => p.type)).toEqual(["Credit (Visa)", "Cash"]);
    expect(s.discountList[0]).toEqual({ name: "Happy hour", count: 5, amount: 35 });
    expect(s.cash).toBeNull();
  });

  it("falls back to the day rows when the file name has no dates", () => {
    const s = parseToastSummary(sheets, "export.xlsx");
    expect([s.startDate, s.endDate]).toEqual(["2026-10-20", "2026-10-21"]);
  });

  it("rejects workbooks that aren't a sales summary", () => {
    expect(() => parseToastSummary({ Sheet1: [["a"], [1]] }, "x.xlsx")).toThrow(
      /Toast Sales Summary/,
    );
  });
});
