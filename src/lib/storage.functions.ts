import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** The restaurant the signed-in member is working in (counting is open to all members). */
async function restaurantFor(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { resolveActiveRestaurant } = await import("./tenant.server");
  return resolveActiveRestaurant(context.supabase, context.userId);
}

export const getStorageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const restaurant = await restaurantFor(context);
    const [locs, links, items, counts] = await Promise.all([
      context.supabase
        .from("storage_locations")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order")
        .order("name"),
      context.supabase
        .from("item_locations")
        .select("id, location_id, inventory_item_id, sort_order")
        .eq("restaurant_id", restaurant.id),
      context.supabase
        .from("inventory_items")
        .select("id, name, unit, vendor_id, current_stock, par_level, reorder_level, cost_per_unit")
        .eq("restaurant_id", restaurant.id)
        .order("name"),
      context.supabase
        .from("inventory_counts")
        .select("id, location_id, status, counted_by_email, total_value, completed_at, created_at")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (locs.error) throw locs.error;
    return {
      locations: locs.data ?? [],
      links: links.data ?? [],
      items: items.data ?? [],
      counts: counts.data ?? [],
    };
  });

export const saveLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; name: string; sortOrder?: number }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Location name is required.");
    const payload = { restaurant_id: restaurant.id, name, sort_order: data.sortOrder ?? 0 };
    const { error } = data.id
      ? await context.supabase
          .from("storage_locations")
          .update(payload)
          .eq("id", data.id)
          .eq("restaurant_id", restaurant.id)
      : await context.supabase.from("storage_locations").insert(payload);
    if (error)
      throw new Error(
        error.code === "23505" ? "A location with that name already exists." : error.message,
      );
    return { ok: true };
  });

export const deleteLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("storage_locations")
      .delete()
      .eq("id", data.id)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });

export const setLocationItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { locationId: string; itemIds: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    // Diff instead of delete-and-reinsert, so each item keeps its last counted quantity here.
    const { data: existing, error: listErr } = await context.supabase
      .from("item_locations")
      .select("id, inventory_item_id")
      .eq("restaurant_id", restaurant.id)
      .eq("location_id", data.locationId);
    if (listErr) throw listErr;
    const keep = new Set(data.itemIds);
    const removed = (existing ?? [])
      .filter((row) => !keep.has(row.inventory_item_id))
      .map((row) => row.id);
    if (removed.length) {
      const { error } = await context.supabase.from("item_locations").delete().in("id", removed);
      if (error) throw error;
    }
    if (data.itemIds.length) {
      const { error } = await context.supabase.from("item_locations").upsert(
        data.itemIds.map((id, index) => ({
          restaurant_id: restaurant.id,
          location_id: data.locationId,
          inventory_item_id: id,
          sort_order: index,
        })),
        { onConflict: "location_id,inventory_item_id" },
      );
      if (error) throw error;
    }
    return { ok: true };
  });

export const getCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { countId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: count, error } = await context.supabase
      .from("inventory_counts")
      .select(
        "id, location_id, status, counted_by_email, note, total_value, completed_at, created_at",
      )
      .eq("id", data.countId)
      .single();
    if (error) throw error;
    const { data: lines } = await context.supabase
      .from("inventory_count_lines")
      .select("location_id, inventory_item_id, quantity, unit_cost")
      .eq("count_id", data.countId);
    return { count, lines: lines ?? [] };
  });

export const startCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { locationId: string | null }) => input)
  .handler(async ({ data, context }) => {
    const restaurant = await restaurantFor(context);
    const { data: row, error } = await context.supabase
      .from("inventory_counts")
      .insert({
        restaurant_id: restaurant.id,
        location_id: data.locationId,
        counted_by: context.userId,
        counted_by_email: (context.claims as { email?: string })?.email ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const saveCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      countId: string;
      complete: boolean;
      note?: string;
      lines: { locationId: string; itemId: string; quantity: number }[];
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const restaurant = await restaurantFor(context);
    const { data: count, error: cErr } = await context.supabase
      .from("inventory_counts")
      .select("id, status")
      .eq("id", data.countId)
      .eq("restaurant_id", restaurant.id)
      .single();
    if (cErr) throw cErr;
    if (count.status === "completed") throw new Error("This count is already completed.");

    const itemIds = [...new Set(data.lines.map((l) => l.itemId))];
    const { data: items } = itemIds.length
      ? await context.supabase.from("inventory_items").select("id, cost_per_unit").in("id", itemIds)
      : { data: [] as { id: string; cost_per_unit: number }[] };
    const cost = new Map(
      (items ?? []).map((i: { id: string; cost_per_unit: number }) => [
        i.id,
        Number(i.cost_per_unit),
      ]),
    );

    const { error: clearErr } = await context.supabase
      .from("inventory_count_lines")
      .delete()
      .eq("count_id", data.countId);
    if (clearErr) throw clearErr;
    const rows = data.lines
      .filter((l) => Number.isFinite(l.quantity))
      .map((l) => ({
        restaurant_id: restaurant.id,
        count_id: data.countId,
        location_id: l.locationId,
        inventory_item_id: l.itemId,
        quantity: Math.max(0, Number(l.quantity)),
        unit_cost: cost.get(l.itemId) ?? 0,
      }));
    if (rows.length) {
      const { error } = await context.supabase.from("inventory_count_lines").insert(rows);
      if (error) throw error;
    }
    const total = rows.reduce((s, r) => s + r.quantity * r.unit_cost, 0);

    const { error } = await context.supabase
      .from("inventory_counts")
      .update({ total_value: total, note: data.note?.trim() || null })
      .eq("id", data.countId)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;

    // Stock is updated in one transaction in the database, summing each
    // item across all of its storage areas.
    if (data.complete) {
      const { error: completeErr } = await context.supabase.rpc("complete_inventory_count", {
        _count_id: data.countId,
      });
      if (completeErr) throw completeErr;
    }
    return { ok: true, total };
  });

export const deleteCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { countId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("inventory_counts")
      .delete()
      .eq("id", data.countId)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });
