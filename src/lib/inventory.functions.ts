import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPublicHttpsUrl } from "./safe-url";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const fetchableUrl = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isPublicHttpsUrl(v), "Use the vendor's public https:// web address.");

const vendorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Vendor name is required.").max(120),
  websiteUrl: z.string().trim().max(500).optional().refine((v) => !v || /^https?:\/\//i.test(v), "Start the website with https://"),
  portalType: z.enum(["manual", "woocommerce"]),
  loginUrl: fetchableUrl,
  ordersUrl: fetchableUrl,
  contactEmail: z.string().trim().max(254).optional().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email."),
  orderCadenceDays: z.coerce.number().int().min(1).max(365),
  orderDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  autoSync: z.boolean(),
  notes: optionalText(2000),
});

const amount = (label: string, max = 1_000_000) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number.` }).min(0, `${label} can't be negative.`).max(max);

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  vendorId: z.string().uuid(),
  name: z.string().trim().min(1, "Item name is required.").max(160),
  unit: z.string().trim().max(30),
  currentStock: amount("Current stock"),
  parLevel: amount("Par level"),
  reorderLevel: amount("Reorder level"),
  costPerUnit: amount("Cost per unit", 100_000),
  qualityRating: z.coerce.number().int().min(1).max(5).nullable(),
  reorderIntervalDays: z.coerce.number().int().min(1).max(365),
  lastOrderedAt: z.string().nullish(),
  lastOrderedQuantity: z.coerce.number().min(0).nullish(),
  notes: optionalText(2000),
  storageArea: optionalText(80),
});

export const listVendors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);

    const { data: vendors, error } = await context.supabase
      .from("vendors")
      .select(
        "id, name, website_url, portal_type, login_url, orders_url, contact_email, order_cadence_days, order_days, auto_sync, sync_status, last_synced_at, last_error, notes",
      )
      .eq("restaurant_id", restaurant.id)
      .order("name");
    if (error) throw error;

    const { data: items } = await context.supabase
      .from("inventory_items")
      .select(
        "id, name, unit, vendor_id, storage_area, current_stock, par_level, reorder_level, cost_per_unit, last_ordered_at, reorder_interval_days",
      )
      .eq("restaurant_id", restaurant.id)
      .order("name");

    const stats = (vendors ?? []).map((vendor) => {
      const own = (items ?? []).filter((i) => i.vendor_id === vendor.id);
      return {
        vendorId: vendor.id,
        itemCount: own.length,
        lowStock: own.filter((i) => Number(i.current_stock) <= Number(i.reorder_level)).length,
        stockValue: own.reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_per_unit), 0),
      };
    });

    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      vendors: vendors ?? [],
      stats,
      items: items ?? [],
      unassignedItems: (items ?? []).filter((i) => !i.vendor_id).length,
    };
  });

export const getVendorDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { vendorId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: vendor, error } = await context.supabase
      .from("vendors")
      .select(
        "id, name, website_url, portal_type, login_url, orders_url, contact_email, order_cadence_days, order_days, auto_sync, sync_status, last_synced_at, last_error, notes",
      )
      .eq("id", data.vendorId)
      .single();
    if (error) throw error;

    const { data: items } = await context.supabase
      .from("inventory_items")
      .select(
        "id, name, unit, storage_area, current_stock, par_level, reorder_level, cost_per_unit, quality_rating, last_ordered_at, last_ordered_quantity, reorder_interval_days, notes",
      )
      .eq("vendor_id", data.vendorId)
      .order("name");

    const { data: orders } = await context.supabase
      .from("vendor_orders")
      .select(
        "id, external_order_id, ordered_at, status, total, source, vendor_order_items(id, name, quantity, unit_price)",
      )
      .eq("vendor_id", data.vendorId)
      .order("ordered_at", { ascending: false })
      .limit(25);

    const { data: creds } = await context.supabase
      .from("vendor_credentials")
      .select("vendor_id")
      .eq("vendor_id", data.vendorId)
      .maybeSingle();

    return { vendor, items: items ?? [], orders: orders ?? [], hasCredentials: Boolean(creds) };
  });

export const saveVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      websiteUrl?: string;
      portalType: string;
      loginUrl?: string;
      ordersUrl?: string;
      contactEmail?: string;
      orderCadenceDays: number;
      orderDays?: number[];
      autoSync: boolean;
      notes?: string;
    }) => vendorSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const payload = {
      restaurant_id: restaurant.id,
      name: data.name,
      website_url: data.websiteUrl || null,
      portal_type: data.portalType,
      login_url: data.loginUrl || null,
      orders_url: data.ordersUrl || null,
      contact_email: data.contactEmail || null,
      order_cadence_days: data.orderCadenceDays,
      order_days: [...new Set(data.orderDays ?? [])],
      auto_sync: data.autoSync,
      notes: data.notes || null,
    };

    const query = data.id
      ? context.supabase.from("vendors").update(payload).eq("id", data.id).eq("restaurant_id", restaurant.id).select("id").single()
      : context.supabase.from("vendors").insert(payload).select("id").single();

    const { data: saved, error } = await query;
    if (error) throw error;
    return saved;
  });

export const deleteVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { vendorId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("vendors").delete().eq("id", data.vendorId).eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { success: true };
  });

export const saveVendorCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { vendorId: string; username: string; password: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    if (!data.username.trim() || !data.password) throw new Error("Username and password are required.");

    const { data: vendor, error } = await context.supabase
      .from("vendors")
      .select("id")
      .eq("id", data.vendorId)
      .eq("restaurant_id", restaurant.id)
      .single();
    if (error || !vendor) throw new Error("Vendor not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: credError } = await supabaseAdmin.from("vendor_credentials").upsert(
      {
        vendor_id: data.vendorId,
        credentials: { username: data.username.trim(), password: data.password },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "vendor_id" },
    );
    if (credError) throw credError;

    await context.supabase
      .from("vendors")
      .update({ sync_status: "connected", last_error: null })
      .eq("id", data.vendorId).eq("restaurant_id", restaurant.id);

    return { success: true };
  });

export const syncVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { vendorId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { data: vendor, error } = await context.supabase
      .from("vendors")
      .select("id, restaurant_id, name, portal_type, login_url, orders_url, order_cadence_days")
      .eq("id", data.vendorId)
      .eq("restaurant_id", restaurant.id)
      .single();
    if (error || !vendor) throw new Error("Vendor not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runVendorSync } = await import("./vendor-sync.server");

    let result: { ok: boolean; message: string; newOrders: number; updatedItems: number };
    try {
      result = await runVendorSync(supabaseAdmin, vendor);
    } catch (syncError) {
      result = {
        ok: false,
        message: syncError instanceof Error ? syncError.message : "Sync failed.",
        newOrders: 0,
        updatedItems: 0,
      };
    }

    await context.supabase
      .from("vendors")
      .update({
        sync_status: result.ok ? "connected" : "error",
        last_synced_at: result.ok ? new Date().toISOString() : null,
        last_error: result.ok ? null : result.message,
      })
      .eq("id", vendor.id);

    return result;
  });

export const saveInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      vendorId: string;
      name: string;
      unit: string;
      currentStock: number;
      parLevel: number;
      reorderLevel: number;
      costPerUnit: number;
      qualityRating: number | null;
      reorderIntervalDays: number;
      lastOrderedAt?: string | null;
      lastOrderedQuantity?: number | null;
      notes?: string;
      storageArea?: string;
    }) => itemSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    // The vendor must be one of this restaurant's vendors.
    const { data: vendor, error: vendorError } = await context.supabase
      .from("vendors")
      .select("id")
      .eq("id", data.vendorId)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (vendorError) throw vendorError;
    if (!vendor) throw new Error("That vendor isn't in this restaurant.");

    const payload = {
      restaurant_id: restaurant.id,
      vendor_id: data.vendorId,
      name: data.name,
      unit: data.unit || "unit",
      current_stock: data.currentStock,
      par_level: data.parLevel,
      reorder_level: data.reorderLevel,
      cost_per_unit: data.costPerUnit,
      quality_rating: data.qualityRating,
      reorder_interval_days: data.reorderIntervalDays,
      last_ordered_at: data.lastOrderedAt || null,
      last_ordered_quantity: data.lastOrderedQuantity ?? null,
      notes: data.notes || null,
      storage_area: data.storageArea || "Dry storage",
    };

    const query = data.id
      ? context.supabase.from("inventory_items").update(payload).eq("id", data.id).eq("restaurant_id", restaurant.id).select("id").single()
      : context.supabase.from("inventory_items").insert(payload).select("id").single();

    const { data: saved, error } = await query;
    if (error) throw error;
    return saved;
  });

export const deleteInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("inventory_items").delete().eq("id", data.itemId).eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { success: true };
  });
