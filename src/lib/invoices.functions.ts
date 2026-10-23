import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ParsedInvoiceLine = { name: string; quantity: number; unitPrice: number };

/** Reads a photo or PDF of an invoice and returns the line items for review. */
export const parseInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dataUrl: string; mimeType: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    if (!data.dataUrl.startsWith("data:")) throw new Error("Please choose a photo or PDF of the invoice.");
    if (data.dataUrl.length > 14_000_000) throw new Error("That file is too large. Try a smaller photo.");

    const { readInvoiceFile } = await import("./invoice-ai.server");
    return readInvoiceFile({ dataUrl: data.dataUrl, mimeType: data.mimeType });
  });

/** Saves a reviewed invoice as a vendor order and folds the items into inventory. */
export const saveInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      vendorId: string;
      invoiceNumber?: string;
      invoiceDate?: string;
      total: number;
      items: ParsedInvoiceLine[];
      addToStock: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const lines = data.items
      .map((item) => ({
        name: item.name.trim(),
        quantity: Math.abs(Number(item.quantity)) || 1,
        unitPrice: Math.abs(Number(item.unitPrice)) || 0,
      }))
      .filter((item) => item.name.length > 0);
    if (lines.length === 0) throw new Error("Add at least one item before saving the invoice.");

    const { data: vendor, error: vendorError } = await context.supabase
      .from("vendors")
      .select("id, restaurant_id, order_cadence_days")
      .eq("id", data.vendorId)
      .single();
    if (vendorError || !vendor) throw new Error("Vendor not found.");

    const orderedAt = data.invoiceDate ? new Date(`${data.invoiceDate}T12:00:00Z`) : new Date();
    const orderedAtIso = (Number.isNaN(orderedAt.getTime()) ? new Date() : orderedAt).toISOString();
    const total = Number(data.total) || lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

    const { data: order, error: orderError } = await context.supabase
      .from("vendor_orders")
      .insert({
        restaurant_id: vendor.restaurant_id,
        vendor_id: vendor.id,
        external_order_id: data.invoiceNumber?.trim() || null,
        ordered_at: orderedAtIso,
        status: "received",
        total,
        source: "invoice",
      })
      .select("id")
      .single();
    if (orderError || !order) throw orderError ?? new Error("The invoice could not be saved.");

    let newItems = 0;
    let updatedItems = 0;

    for (const line of lines) {
      const { data: existing } = await context.supabase
        .from("inventory_items")
        .select("id, current_stock, last_ordered_at")
        .eq("restaurant_id", vendor.restaurant_id)
        .ilike("name", line.name)
        .maybeSingle();

      let inventoryItemId = existing?.id ?? null;

      if (existing) {
        const isNewer =
          !existing.last_ordered_at ||
          new Date(orderedAtIso).getTime() > new Date(existing.last_ordered_at).getTime();
        const update: {
          vendor_id: string;
          current_stock: number;
          cost_per_unit?: number;
          last_ordered_at?: string;
          last_ordered_quantity?: number;
        } = {
          vendor_id: vendor.id,
          current_stock: data.addToStock
            ? Number(existing.current_stock) + line.quantity
            : Number(existing.current_stock),
        };
        if (isNewer) {
          update.cost_per_unit = line.unitPrice;
          update.last_ordered_at = orderedAtIso;
          update.last_ordered_quantity = line.quantity;
        }
        await context.supabase.from("inventory_items").update(update).eq("id", existing.id);
        updatedItems += 1;
      } else {
        const { data: created } = await context.supabase
          .from("inventory_items")
          .insert({
            restaurant_id: vendor.restaurant_id,
            vendor_id: vendor.id,
            name: line.name,
            unit: "case",
            current_stock: data.addToStock ? line.quantity : 0,
            reorder_level: 1,
            par_level: line.quantity,
            cost_per_unit: line.unitPrice,
            last_ordered_at: orderedAtIso,
            last_ordered_quantity: line.quantity,
            reorder_interval_days: vendor.order_cadence_days || 7,
          })
          .select("id")
          .single();
        inventoryItemId = created?.id ?? null;
        newItems += 1;
      }

      await context.supabase.from("vendor_order_items").insert({
        restaurant_id: vendor.restaurant_id,
        vendor_order_id: order.id,
        inventory_item_id: inventoryItemId,
        name: line.name,
        quantity: line.quantity,
        unit_price: line.unitPrice,
      });
    }

    return { orderId: order.id, newItems, updatedItems, lines: lines.length };
  });
