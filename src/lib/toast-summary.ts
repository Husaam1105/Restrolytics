// Parses a Toast "Sales Summary" workbook (already converted to sheet → rows arrays).
export type ToastSummary = {
  location: string | null;
  startDate: string;
  endDate: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  tax: number;
  tips: number;
  total: number;
  orders: number;
  guests: number;
  avgOrder: number;
  payments: { type: string; count: number; amount: number; tips: number; total: number }[];
  dining: { option: string; orders: number; netSales: number; discounts: number }[];
  days: { date: string; netSales: number; orders: number; guests: number }[];
  discountList: { name: string; count: number; amount: number }[];
  cash: { payments: number; expected: number; actual: number; overShort: number } | null;
  voids: { count: number; amount: number } | null;
};

type Rows = unknown[][];
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

function table(sheets: Record<string, Rows>, name: string): Record<string, unknown>[] {
  const rows = sheets[name];
  if (!rows || rows.length < 2) return [];
  const head = (rows[0] ?? []).map(str);
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

export function parseToastSummary(sheets: Record<string, Rows>, fileName: string): ToastSummary {
  const m = fileName.match(/(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/);
  const days = table(sheets, "Sales by day")
    .filter((r) => /^\d{8}$/.test(str(r["yyyyMMdd"])))
    .map((r) => {
      const d = str(r["yyyyMMdd"]);
      return {
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        netSales: num(r["Net sales"]),
        orders: num(r["Total orders"]),
        guests: num(r["Total guests"]),
      };
    });
  const startDate = m?.[1] ?? days[0]?.date;
  const endDate = m?.[2] ?? days[days.length - 1]?.date;
  if (!startDate || !endDate || !sheets["Net sales summary"]) {
    throw new Error("This doesn't look like a Toast Sales Summary export");
  }
  const net = table(sheets, "Net sales summary")[0] ?? {};
  const rev = table(sheets, "Revenue summary")[0] ?? {};
  const mode =
    table(sheets, "Service mode summary").find((r) => str(r["Service mode"]) === "Total") ?? {};
  const cashAct = table(sheets, "Cash activity")[0];
  const cashSum = table(sheets, "Cash summary")[0];
  const voids = table(sheets, "Void summary")[0];
  const discountList = [
    ...table(sheets, "Menu Item Discounts"),
    ...table(sheets, "Check Discounts"),
  ]
    .filter((r) => str(r["Discount"]) && str(r["Discount"]) !== "Total")
    .map((r) => ({ name: str(r["Discount"]), count: num(r["Count"]), amount: num(r["Amount"]) }))
    .sort((a, b) => b.amount - a.amount);

  return {
    location: str(sheets["All data"]?.[1]?.[0]).replace(/^-/, "") || null,
    startDate,
    endDate,
    grossSales: num(net["Gross sales"]),
    discounts: Math.abs(num(net["Sales discounts"])),
    refunds: Math.abs(num(net["Sales refunds"])),
    netSales: num(net["Net sales"]),
    tax: num(rev["Tax amount"]),
    tips: num(rev["Tips"]),
    total: num(rev["Total"]),
    orders: num(mode["Total orders"]),
    guests: num(mode["Total guests"]),
    avgOrder: num(mode["Avg/Order"]),
    payments: table(sheets, "Payments summary")
      .filter((r) => str(r["Payment type"]) && str(r["Payment type"]) !== "Total")
      .map((r) => ({
        type: str(r["Payment sub type"])
          ? `${str(r["Payment type"])} (${str(r["Payment sub type"])})`
          : str(r["Payment type"]),
        count: num(r["Count"]),
        amount: num(r["Amount"]),
        tips: num(r["Tips"]),
        total: num(r["Total"]),
      }))
      .filter((p) => p.count > 0),
    dining: table(sheets, "Dining options summary")
      .filter((r) => str(r["Dining option"]) && str(r["Dining option"]) !== "Total")
      .map((r) => ({
        option: str(r["Dining option"]),
        orders: num(r["Orders"]),
        netSales: num(r["Net sales"]),
        discounts: num(r["Discount amount"]),
      }))
      .sort((a, b) => b.netSales - a.netSales),
    days,
    discountList,
    cash: cashAct
      ? {
          payments: num(cashAct["Total cash payments"]),
          expected: num(cashSum?.["Expected closeout cash"]),
          actual: num(cashSum?.["Actual closeout cash"]),
          overShort: num(cashSum?.["Cash overage/shortage"]),
        }
      : null,
    voids: voids
      ? { count: num(voids["Void order count"]), amount: num(voids["Void amount"]) }
      : null,
  };
}

export type ToastProductMix = {
  startDate: string;
  endDate: string;
  totals: { qty: number; gross: number; discounts: number; voids: number; net: number };
  groups: { name: string; qty: number; net: number; discounts: number }[];
  items: {
    name: string;
    qty: number;
    avgPrice: number;
    gross: number;
    discounts: number;
    voids: number;
    net: number;
  }[];
};

export type ToastRemovedItems = {
  startDate: string;
  endDate: string;
  totalQty: number;
  totalAmount: number;
  rows: {
    at: string;
    date: string;
    order: string;
    server: string;
    item: string;
    qty: number;
    amount: number;
  }[];
};

export function parseToastProductMix(
  sheets: Record<string, Rows>,
  fileName: string,
): ToastProductMix {
  const m = fileName.match(/(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/);
  if (!m || !sheets["Items"]) throw new Error("This doesn't look like a Toast Product Mix export");
  const items = table(sheets, "Items");
  const total = items.find((r) => !str(r["Item"])) ?? {};
  return {
    startDate: m[1]!,
    endDate: m[2]!,
    totals: {
      qty: num(total["Qty sold"]),
      gross: num(total["Gross item amt"]),
      discounts: num(total["Discount amt"]),
      voids: num(total["Void amt"]),
      net: num(total["Net item amt"]),
    },
    groups: table(sheets, "Menu groups")
      .filter((r) => str(r["Menu group"]) && !str(r["Subgroup"]))
      .map((r) => ({
        name: str(r["Menu group"]),
        qty: num(r["Qty sold"]),
        net: num(r["Net item amt"]),
        discounts: num(r["Discount amt"]),
      }))
      .sort((a, b) => b.net - a.net),
    items: items
      .filter((r) => str(r["Item"]))
      .map((r) => ({
        name: str(r["Item"]),
        qty: num(r["Qty sold"]),
        avgPrice: num(r["Avg. price"]),
        gross: num(r["Gross item amt"]),
        discounts: num(r["Discount amt"]),
        voids: num(r["Void amt"]),
        net: num(r["Net item amt"]),
      }))
      .sort((a, b) => b.net - a.net),
  };
}

function usDate(v: string) {
  const d = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!d) return null;
  const y = d[3]!.length === 2 ? `20${d[3]}` : d[3]!;
  return `${y}-${d[1]!.padStart(2, "0")}-${d[2]!.padStart(2, "0")}`;
}

export function parseToastRemovedItems(rows: Rows, fileName: string): ToastRemovedItems {
  const head = (rows[0] ?? []).map(str);
  if (!head.includes("Removed Date") || !head.includes("Item Name")) {
    throw new Error("This doesn't look like a Toast Removed Items export");
  }
  const col = (n: string) => head.indexOf(n);
  const list = rows
    .slice(1)
    .map((r) => {
      const at = str(r[col("Removed Date")]);
      return {
        at,
        date: usDate(at) ?? "",
        order: str(r[col("Order #")]),
        server: str(r[col("Server")]),
        item: str(r[col("Item Name")]),
        qty: num(r[col("Item Quantity")]),
        amount: num(r[col("Total Price")]),
      };
    })
    .filter((r) => r.date && r.item);
  const f = fileName.match(/(\d{4})_(\d{2})_(\d{2})-(\d{4})_(\d{2})_(\d{2})/);
  const dates = list.map((r) => r.date).sort();
  const startDate = f ? `${f[1]}-${f[2]}-${f[3]}` : dates[0];
  const endDate = f ? `${f[4]}-${f[5]}-${f[6]}` : dates[dates.length - 1];
  if (!startDate || !endDate) throw new Error("No removed items found in this file");
  return {
    startDate,
    endDate,
    totalQty: list.reduce((s, r) => s + r.qty, 0),
    totalAmount: list.reduce((s, r) => s + r.amount, 0),
    rows: list,
  };
}
