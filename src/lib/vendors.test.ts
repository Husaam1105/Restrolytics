import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { describeSchedule, nextOrderDate, orderUrgency, type VendorItem } from "./vendors";

const item = (overrides: Partial<VendorItem>): VendorItem =>
  ({
    current_stock: 10,
    reorder_level: 2,
    last_ordered_at: null,
    reorder_interval_days: 7,
    ...overrides,
  }) as VendorItem;

describe("describeSchedule", () => {
  it("lists weekdays in order", () => {
    expect(describeSchedule({ order_days: [5, 1], order_cadence_days: 7 })).toBe("orders Mon, Fri");
  });

  it("falls back to the cadence", () => {
    expect(describeSchedule({ order_days: [], order_cadence_days: 1 })).toBe("orders every 1 day");
    expect(describeSchedule({ order_days: null, order_cadence_days: 3 })).toBe(
      "orders every 3 days",
    );
  });
});

describe("nextOrderDate", () => {
  it("is null until the item has been ordered", () => {
    expect(nextOrderDate(item({}))).toBeNull();
  });

  it("adds the reorder interval", () => {
    const next = nextOrderDate(
      item({ last_ordered_at: "2026-10-01T12:00:00", reorder_interval_days: 5 }),
    );
    expect(next?.getDate()).toBe(6);
  });

  it("picks the next scheduled weekday after the last order", () => {
    // Thursday Oct 22 2026; vendor delivers Mondays and Thursdays.
    const next = nextOrderDate(item({ last_ordered_at: "2026-10-22T12:00:00" }), [1, 4]);
    expect(next?.getDay()).toBe(1);
    expect(next?.getDate()).toBe(26);
  });
});

describe("orderUrgency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T12:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("flags low stock with no order history as due", () => {
    expect(orderUrgency(item({ current_stock: 1 }))).toBe("due");
    expect(orderUrgency(item({}))).toBe("ok");
  });

  it("is overdue once the next order date has passed", () => {
    expect(orderUrgency(item({ last_ordered_at: "2026-10-10T12:00:00" }))).toBe("overdue");
  });

  it("is due within a day of the next order", () => {
    expect(orderUrgency(item({ last_ordered_at: "2026-10-17T00:00:00" }))).toBe("due");
    expect(orderUrgency(item({ last_ordered_at: "2026-10-22T12:00:00" }))).toBe("ok");
  });
});
