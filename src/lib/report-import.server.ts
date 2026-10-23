import type { SupabaseClient } from "@supabase/supabase-js";
import { dayRangeUtc } from "./operating-day";

export type ReportKind = "payments" | "payouts" | "errors" | "ratings" | "item_ratings";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

type Rec = Record<string, string>;

/** Finds the real header row (Uber adds a descriptive row above it in some reports). */
function toRecords(rows: string[][]): { kind: ReportKind | null; records: Rec[] } {
  for (let h = 0; h < Math.min(rows.length, 4); h++) {
    const header = rows[h]!.map((c) => c.replace(/^\uFEFF/, "").trim());
    const has = (name: string) => header.includes(name);
    let kind: ReportKind | null = null;
    if (has("Workflow ID") && has("Total payout")) kind = "payments";
    else if (has("Order Count") && has("Payout reference ID")) kind = "payouts";
    else if (has("Order Issue") && has("Customer Refunded")) kind = "errors";
    else if (has("Rating Value") && has("Item Name")) kind = "item_ratings";
    else if (has("Rating Value")) kind = "ratings";
    if (!kind) continue;
    const records = rows.slice(h + 1).map((r) => {
      const rec: Rec = {};
      header.forEach((name, i) => (rec[name] = (r[i] ?? "").trim()));
      return rec;
    });
    return { kind, records };
  }
  return { kind: null, records: [] };
}

const num = (v: string | undefined) => {
  const n = Number((v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** "9/28/26" or "2026-09-28" → "2026-09-28" */
function isoDate(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!us) return null;
  const y = us[3]!.length === 2 ? `20${us[3]}` : us[3]!;
  return `${y}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}`;
}

/** Local "1:13 PM" / "13:53:24" → seconds since midnight */
function secondsOf(v: string | undefined): number | null {
  const m = (v ?? "").match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[4]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
}

function localToUtc(date: string, seconds: number | null, tz: string) {
  const { start } = dayRangeUtc(date, tz);
  return new Date(new Date(start).getTime() + (seconds ?? 12 * 3600) * 1000).toISOString();
}

function status(v: string) {
  const s = v.toLowerCase();
  if (s.startsWith("refund")) return "refunded";
  if (s.startsWith("cancel")) return "cancelled";
  if (s.startsWith("unfulfilled")) return "failed";
  return s || "completed";
}

/** Keep only the last row per conflict key — reports can list the same order twice. */
function dedupe<T>(rows: T[], key: (row: T) => string): T[] {
  const map = new Map<string, T>();
  for (const row of rows) map.set(key(row), row);
  return Array.from(map.values());
}

export async function importReport(
  supabase: SupabaseClient,
  opts: {
    restaurantId: string;
    platform: string;
    timezone: string;
    text: string;
    userId: string;
    userEmail: string | null;
  },
) {
  const { kind, records } = toRecords(parseCsv(opts.text));
  if (!kind) throw new Error("This file doesn't look like a supported Uber Eats report.");
  const base = { restaurant_id: opts.restaurantId, platform: opts.platform };

  if (kind === "payments") {
    const orders = records.filter((r) => r["Order ID"] && !r["Item Name"]);
    const rows = dedupe(
      orders.map((r) => {
        const date = isoDate(r["Order Date"]) ?? new Date().toISOString().slice(0, 10);
        const feeBreakdown = {
          marketplace: num(r["Marketplace Fee"]),
          tax_on_marketplace: num(r["Tax on Marketplace Fee"]),
          delivery_network: num(r["Delivery Network Fee"]),
          order_processing: num(r["Order Processing Fee"]),
          offer_redemption: num(r["Offer Redemption Fee"]),
        };
        const fees = Object.values(feeBreakdown).reduce((a, b) => a + b, 0);
        return {
          ...base,
          external_id: r["Workflow ID"] || r["Order ID"],
          order_number: r["Order ID"]!.replace(/^#/, ""),
          total: num(r["Sales (incl. tax)"]),
          tax: num(r["Tax on Sales"]),
          tip: num(r["Tips"]),
          status: status(r["Order Status"] ?? ""),
          created_at: localToUtc(date, secondsOf(r["Order Accept Time"]), opts.timezone),
          payout: num(r["Total payout"] ?? r["Total payout "]),
          fees,
          fee_breakdown: feeBreakdown,
          promotions: num(r["Offers on items (incl. tax)"]) + num(r["Delivery Offer Redemptions (incl. tax)"]),
          fulfillment: r["Dining Mode"] || null,
          payout_date: isoDate(r["Payout Date"]),
        };
      }),
      (row) => row.external_id as string,
    );
    if (rows.length) {
      const { error } = await supabase
        .from("sales")
        .upsert(rows, { onConflict: "restaurant_id,platform,external_id" });
      if (error) throw error;
    }
    return { kind, imported: rows.length, label: `${rows.length} orders` };
  }

  if (kind === "payouts") {
    const rows = dedupe(
      records
        .filter((r) => r["Payout reference ID"])
        .map((r) => ({
          ...base,
          reference_id: r["Payout reference ID"]!,
          payout_date: isoDate(r["Payout Date"]),
          order_count: Math.round(num(r["Order Count"])),
          sales: num(r["Sales (incl. tax)"]),
          fees:
            num(r["Marketplace Fee"]) +
            num(r["Delivery Network Fee"]) +
            num(r["Order Processing Fee"]) +
            num(r["Offer Redemption Fee"]),
          promotions: num(r["Offers on items (incl. tax)"]) + num(r["Delivery Offer Redemptions (incl. tax)"]),
          refunds: num(r["Chargeback Amount (incl. tax)"]),
          other: num(r["Other payments"]),
          total_payout: num(r["Total payout"]),
        })),
      (row) => row.reference_id,
    );
    if (rows.length) {
      const { error } = await supabase
        .from("platform_payouts")
        .upsert(rows, { onConflict: "restaurant_id,platform,reference_id" });
      if (error) throw error;
    }
    return { kind, imported: rows.length, label: `${rows.length} payout${rows.length === 1 ? "" : "s"}` };
  }

  if (kind === "errors") {
    const rows = dedupe(
      records
        .filter((r) => r["Order ID"])
        .map((r) => {
          const issue = (r["Order Issue"] ?? "Issue").replace(/_/g, " ").toLowerCase();
          const items = r["Items with error"] ? `: ${r["Items with error"]}` : "";
          const feedback = r["Customer Feedback"] ? ` (“${r["Customer Feedback"]}”)` : "";
          return {
            ...base,
            external_id: `error:${r["Order ID"]}:${r["Order Issue"] ?? ""}`,
            business_date: isoDate(r["Time Customer Ordered"]) ?? new Date().toISOString().slice(0, 10),
            category: "refund",
            amount: num(r["Customer Refunded"]),
            description: `Uber Eats #${r["Order ID"]}: ${issue}${items}${feedback}. You were charged ${num(r["Chargeback Amount"]).toFixed(2)}.`,
            created_by: opts.userId,
            created_by_email: opts.userEmail ?? "Uber Eats report",
          };
        }),
      (row) => row.external_id,
    );
    if (rows.length) {
      const { error } = await supabase
        .from("day_issues")
        .upsert(rows, { onConflict: "restaurant_id,platform,external_id" });
      if (error) throw error;
    }
    return { kind, imported: rows.length, label: `${rows.length} order error${rows.length === 1 ? "" : "s"}` };
  }

  // ratings / item ratings
  const rows = dedupe(
    records
      .filter((r) => r["Order ID"])
      .map((r) => ({
        ...base,
        order_id: r["Order ID"]!,
        item_name: kind === "item_ratings" ? r["Item Name"] ?? "" : "",
        rating_date: isoDate(r["Rating Date"]),
        rating_value: num(r["Rating Value"]),
        tags: r["Rating Tags"] ? r["Rating Tags"].replace(/_/g, " ") : null,
        comment: r["Comment"] || null,
      })),
    (row) => `${row.order_id}|${row.item_name}`,
  );
  if (rows.length) {
    const { error } = await supabase
      .from("platform_ratings")
      .upsert(rows, { onConflict: "restaurant_id,platform,order_id,item_name" });
    if (error) throw error;
  }
  return {
    kind,
    imported: rows.length,
    label: `${rows.length} ${kind === "item_ratings" ? "item ratings" : "ratings"}`,
  };
}
