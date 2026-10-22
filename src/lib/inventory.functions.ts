import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listVendors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ensureOwnedRestaurant } = await import("./integrations.server");
    const restaurant = await ensureOwnedRestaurant(context.supabase, context.userId);

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
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!data.name.trim()) throw new Error("Vendor name is required.");
    const { ensureOwnedRestaurant } = await import("./integrations.server");
    const restaurant = await ensureOwnedRestaurant(context.supabase, context.userId);

    const payload = {
      restaurant_id: restaurant.id,
      name: data.name.trim(),
      website_url: data.websiteUrl?.trim() || null,
      portal_type: data.portalType,
      login_url: data.loginUrl?.trim() || null,
      orders_url: data.ordersUrl?.trim() || null,
      contact_email: data.contactEmail?.trim() || null,
      order_cadence_days: Math.max(1, Number(data.orderCadenceDays) || 7),
      order_days: (data.orderDays ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
      auto_sync: data.autoSync,
      notes: data.notes?.trim() || null,
    };

    const query = data.id
      ? context.supabase.from("vendors").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("vendors").insert(payload).select("id").single();

    const { data: saved, error } = await query;
    if (error) throw error;
    return saved;
  });

export const deleteVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { vendorId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("vendors").delete().eq("id", data.vendorId);
    if (error) throw error;
    return { success: true };
  });

export const saveVendorCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { vendorId: string; username: string; password: string }) => input)
  .handler(async ({ data, context }) => {
    if (!data.username.trim() || !data.password) throw new Error("Username and password are required.");

    const { data: vendor, error } = await context.supabase
      .from("vendors")
      .select("id")
      .eq("id", data.vendorId)
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
      .eq("id", data.vendorId);

    return { success: true };
  });

export const syncVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { vendorId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: vendor, error } = await context.supabase
      .from("vendors")
      .select("id, restaurant_id, name, portal_type, login_url, orders_url, order_cadence_days")
      .eq("id", data.vendorId)
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
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!data.name.trim()) throw new Error("Item name is required.");
    const { ensureOwnedRestaurant } = await import("./integrations.server");
    const restaurant = await ensureOwnedRestaurant(context.supabase, context.userId);

    const payload = {
      restaurant_id: restaurant.id,
      vendor_id: data.vendorId,
      name: data.name.trim(),
      unit: data.unit.trim() || "unit",
      current_stock: Number(data.currentStock) || 0,
      par_level: Number(data.parLevel) || 0,
      reorder_level: Number(data.reorderLevel) || 0,
      cost_per_unit: Number(data.costPerUnit) || 0,
      quality_rating: data.qualityRating,
      reorder_interval_days: Math.max(1, Number(data.reorderIntervalDays) || 7),
      last_ordered_at: data.lastOrderedAt || null,
      last_ordered_quantity: data.lastOrderedQuantity ?? null,
      notes: data.notes?.trim() || null,
      storage_area: data.storageArea?.trim() || "Dry storage",
    };

    const query = data.id
      ? context.supabase.from("inventory_items").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("inventory_items").insert(payload).select("id").single();

    const { data: saved, error } = await query;
    if (error) throw error;
    return saved;
  });

export const deleteInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("inventory_items").delete().eq("id", data.itemId);
    if (error) throw error;
    return { success: true };
  });
