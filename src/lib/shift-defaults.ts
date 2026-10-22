export type TaskArea = "foh" | "boh";
export type TaskShift = "opening" | "closing";

export const DEFAULT_TASKS: Record<TaskArea, Record<TaskShift, string[]>> = {
  foh: {
    opening: [
      "Unlock doors and disarm alarm",
      "Turn on lights, music and POS terminals",
      "Count cash drawer and set float",
      "Wipe tables, set placemats and cutlery",
      "Stock napkins, straws and to-go bags",
      "Check delivery tablets are online",
    ],
    closing: [
      "Cash out drawer and drop deposit",
      "Run end-of-day POS report",
      "Wipe down tables, chairs and menus",
      "Sweep and mop dining room",
      "Take out trash and restock restrooms",
      "Lock doors, set alarm, lights off",
    ],
  },
  boh: {
    opening: [
      "Turn on hoods, grills, fryers and ovens",
      "Record walk-in and freezer temperatures",
      "Check prep list and pull product",
      "Date-label all prepped items",
      "Check vendor deliveries against invoices",
      "Sanitizer buckets filled and tested",
    ],
    closing: [
      "Break down and clean line stations",
      "Filter fryers and turn off equipment",
      "Wrap, label and store all product",
      "Run final dish load and clean sinks",
      "Log closing cooler temperatures",
      "Update prep and order list for tomorrow",
    ],
  },
};

export function seedRows(restaurantId: string, area: TaskArea, shift: TaskShift) {
  return DEFAULT_TASKS[area][shift].map((title, i) => {
    const isTemp = /temp/i.test(title);
    return {
      restaurant_id: restaurantId,
      area,
      shift,
      title,
      sort_order: i + 1,
      input_type: isTemp ? "temperature" : "none",
      input_label: isTemp ? "Temperatures" : null,
      input_unit: isTemp ? "°F" : null,
    };
  });
}

export function allSeedRows(restaurantId: string) {
  return (["foh", "boh"] as TaskArea[]).flatMap((area) =>
    (["opening", "closing"] as TaskShift[]).flatMap((shift) => seedRows(restaurantId, area, shift)),
  );
}
