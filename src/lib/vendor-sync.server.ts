import type { SupabaseClient } from "@supabase/supabase-js";
import { itemNameKey } from "./item-match";
import { isPublicHttpsUrl } from "./safe-url";
import { assertPublicDns } from "./safe-url.server";

type Cookies = Map<string, string>;

function mergeCookies(jar: Cookies, response: Response) {
  const raw = (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  const list = raw.length > 0 ? raw : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
  for (const entry of list) {
    for (const part of entry.split(/,(?=[^;]+?=)/g)) {
      const [pair] = part.split(";");
      const idx = pair?.indexOf("=") ?? -1;
      if (!pair || idx < 1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === "deleted" || value === "") jar.delete(name);
      else jar.set(name, value);
    }
  }
}

function cookieHeader(jar: Cookies) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MAX_REDIRECTS = 5;

/**
 * Fetch with a cookie jar. Every URL, including each redirect hop, must be a
 * public https address, so a vendor site can't bounce the server into a
 * private network, and redirect chains are capped.
 */
async function jarFetch(url: string, jar: Cookies, init?: RequestInit, hops = 0): Promise<Response> {
  await assertPublicDns(url);
  if (hops > MAX_REDIRECTS) {
    throw new Error("The vendor site redirected too many times.");
  }
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      ...(cookieHeader(jar) ? { Cookie: cookieHeader(jar) } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  mergeCookies(jar, response);

  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    return jarFetch(new URL(location, url).toString(), jar, { method: "GET" }, hops + 1);
  }
  return response;
}

function decodeEntities(input: string) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#039;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#215;|&times;/g, "x")
    .trim();
}

function stripTags(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function parseMoney(text: string) {
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export type ScrapedItem = { name: string; quantity: number; unitPrice: number };
export type ScrapedOrder = {
  externalId: string;
  orderedAt: string;
  status: string;
  total: number;
  detailUrl: string | null;
  items: ScrapedItem[];
};

/** Logs into a WooCommerce storefront and reads the customer's order history. */
export async function scrapeWooCommerceOrders(options: {
  loginUrl: string;
  ordersUrl: string;
  username: string;
  password: string;
  maxOrders?: number;
}): Promise<ScrapedOrder[]> {
  const jar: Cookies = new Map();

  const loginPage = await jarFetch(options.loginUrl, jar);
  const loginHtml = await loginPage.text();
  const nonce = loginHtml.match(/name="woocommerce-login-nonce"[^>]*value="([^"]+)"/)?.[1];

  const body = new URLSearchParams({
    username: options.username,
    password: options.password,
    login: "Log in",
    "woocommerce-login-nonce": nonce ?? "",
    _wp_http_referer: new URL(options.loginUrl).pathname,
    rememberme: "forever",
  });

  const loginResult = await jarFetch(options.loginUrl, jar, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  await loginResult.text();

  const hasSession = [...jar.keys()].some((k) => k.startsWith("wordpress_logged_in"));
  if (!hasSession) {
    throw new Error("Vendor portal rejected the login. Check the username and password.");
  }

  const ordersResponse = await jarFetch(options.ordersUrl, jar);
  const ordersHtml = await ordersResponse.text();
  if (/woocommerce-form-login|Username or email/i.test(ordersHtml) && !/orders-table|order-number/i.test(ordersHtml)) {
    throw new Error("Signed in but the orders page was not accessible.");
  }

  const rows = ordersHtml.match(/<tr[^>]*class="[^"]*orders-table__row[^"]*"[\s\S]*?<\/tr>/gi) ?? [];
  const orders: ScrapedOrder[] = [];

  for (const row of rows.slice(0, options.maxOrders ?? 20)) {
    const numberCell = row.match(/order-number[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "";
    const externalId = stripTags(numberCell).replace(/^#/, "").trim();
    if (!externalId) continue;

    const dateAttr = row.match(/<time[^>]*datetime="([^"]+)"/i)?.[1];
    const dateText = row.match(/order-date[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "";
    const parsedDate = dateAttr ? new Date(dateAttr) : new Date(stripTags(dateText));
    const orderedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const status = stripTags(row.match(/order-status[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "") || "completed";
    const total = parseMoney(stripTags(row.match(/order-total[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ""));
    const href = row.match(/href="([^"]*view-order[^"]*)"/i)?.[1];
    const detailUrl = href ? new URL(decodeEntities(href), options.ordersUrl).toString() : null;

    let items: ScrapedItem[] = [];
    if (detailUrl) {
      try {
        const detailResponse = await jarFetch(detailUrl, jar);
        items = parseWooOrderItems(await detailResponse.text());
      } catch {
        items = [];
      }
    }

    orders.push({
      externalId,
      orderedAt: orderedAt.toISOString(),
      status: status.toLowerCase(),
      total,
      detailUrl,
      items,
    });
  }

  return orders;
}

export function parseWooOrderItems(html: string): ScrapedItem[] {
  const rows = html.match(/<tr[^>]*class="[^"]*order_item[^"]*"[\s\S]*?<\/tr>/gi) ?? [];
  const items: ScrapedItem[] = [];

  for (const row of rows) {
    const nameCell = row.match(/product-name[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "";
    const quantityRaw = nameCell.match(/product-quantity[^>]*>([\s\S]*?)<\//i)?.[1] ?? "";
    const quantity = Math.abs(parseMoney(stripTags(quantityRaw))) || 1;
    const name = stripTags(nameCell.replace(/<strong[\s\S]*?<\/strong>/gi, ""));
    if (!name) continue;
    const lineTotal = parseMoney(stripTags(row.match(/product-total[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ""));
    items.push({ name, quantity, unitPrice: quantity ? Number((lineTotal / quantity).toFixed(2)) : lineTotal });
  }

  return items;
}

type VendorRow = {
  id: string;
  restaurant_id: string;
  name: string;
  portal_type: string;
  login_url: string | null;
  orders_url: string | null;
  order_cadence_days: number;
};

/**
 * Fetches new orders from a vendor's portal and folds them into vendor_orders,
 * vendor_order_items and inventory_items (stock, last ordered date and quantity).
 */
export async function runVendorSync(admin: SupabaseClient, vendor: VendorRow) {
  if (vendor.portal_type !== "woocommerce") {
    return { ok: false, message: "This vendor has no supported online portal yet.", newOrders: 0, updatedItems: 0 };
  }
  if (!vendor.login_url || !vendor.orders_url) {
    return { ok: false, message: "Add the vendor's login and orders page URLs first.", newOrders: 0, updatedItems: 0 };
  }
  // Vendors saved before URL validation existed are re-checked here.
  if (!isPublicHttpsUrl(vendor.login_url) || !isPublicHttpsUrl(vendor.orders_url)) {
    return { ok: false, message: "Edit this vendor: its portal addresses must be public https:// websites.", newOrders: 0, updatedItems: 0 };
  }

  const { data: creds } = await admin
    .from("vendor_credentials")
    .select("credentials")
    .eq("vendor_id", vendor.id)
    .maybeSingle();

  const credentials = (creds?.credentials ?? {}) as Record<string, string>;
  if (!credentials['username'] || !credentials['password']) {
    return { ok: false, message: "Save the vendor portal login before syncing.", newOrders: 0, updatedItems: 0 };
  }

  const orders = await scrapeWooCommerceOrders({
    loginUrl: vendor.login_url,
    ordersUrl: vendor.orders_url,
    username: credentials['username'],
    password: credentials['password'],
  });

  const { data: existing } = await admin
    .from("vendor_orders")
    .select("external_order_id")
    .eq("vendor_id", vendor.id);
  const known = new Set((existing ?? []).map((o) => o.external_order_id));

  let newOrders = 0;
  let updatedItems = 0;

  // Oldest first, so the newest order always has the final say on "last ordered".
  const ordered = [...orders].sort((a, b) => new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime());

  for (const order of ordered) {
    if (known.has(order.externalId)) continue;

    const { data: inserted, error } = await admin
      .from("vendor_orders")
      .insert({
        restaurant_id: vendor.restaurant_id,
        vendor_id: vendor.id,
        external_order_id: order.externalId,
        ordered_at: order.orderedAt,
        status: order.status,
        total: order.total,
        source: "portal",
      })
      .select("id")
      .single();
    if (error || !inserted) continue;
    newOrders += 1;

    for (const item of order.items) {
      const { data: existingItem } = await admin
        .from("inventory_items")
        .select("id, current_stock, last_ordered_at")
        .eq("restaurant_id", vendor.restaurant_id)
        .eq("name_key", itemNameKey(item.name))
        .maybeSingle();

      let inventoryItemId = existingItem?.id ?? null;

      if (inventoryItemId) {
        const isNewer =
          !existingItem!.last_ordered_at ||
          new Date(order.orderedAt).getTime() > new Date(existingItem!.last_ordered_at).getTime();
        await admin
          .from("inventory_items")
          .update({
            vendor_id: vendor.id,
            current_stock: Number(existingItem!.current_stock) + item.quantity,
            ...(isNewer
              ? {
                  cost_per_unit: item.unitPrice,
                  last_ordered_at: order.orderedAt,
                  last_ordered_quantity: item.quantity,
                }
              : {}),
          })
          .eq("id", inventoryItemId);
      } else {
        const { data: created } = await admin
          .from("inventory_items")
          .insert({
            restaurant_id: vendor.restaurant_id,
            vendor_id: vendor.id,
            name: item.name,
            unit: "case",
            current_stock: item.quantity,
            reorder_level: 1,
            par_level: item.quantity,
            cost_per_unit: item.unitPrice,
            last_ordered_at: order.orderedAt,
            last_ordered_quantity: item.quantity,
            reorder_interval_days: vendor.order_cadence_days || 7,
          })
          .select("id")
          .single();
        inventoryItemId = created?.id ?? null;
      }

      updatedItems += 1;

      await admin.from("vendor_order_items").insert({
        restaurant_id: vendor.restaurant_id,
        vendor_order_id: inserted.id,
        inventory_item_id: inventoryItemId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      });
    }
  }

  return {
    ok: true,
    message:
      newOrders > 0
        ? `Imported ${newOrders} new order${newOrders === 1 ? "" : "s"} and updated ${updatedItems} item${updatedItems === 1 ? "" : "s"}.`
        : "No new orders on the vendor portal.",
    newOrders,
    updatedItems,
  };
}
