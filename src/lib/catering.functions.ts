import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CateringOrderInput = {
  id?: string | null;
  customerName: string;
  contact?: string | null;
  eventDate: string;
  eventTime?: string | null;
  headcount?: number | null;
  location?: string | null;
  total: number;
  status: string;
  notes?: string | null;
};

export const getCatering = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);

    const [ordersRes, paymentsRes] = await Promise.all([
      context.supabase
        .from("catering_orders")
        .select(
          "id, customer_name, contact, event_date, event_time, headcount, location, total, status, notes",
        )
        .eq("restaurant_id", restaurant.id)
        .order("event_date", { ascending: false }),
      context.supabase
        .from("catering_payments")
        .select("id, order_id, amount, method, paid_at, note")
        .eq("restaurant_id", restaurant.id)
        .order("paid_at", { ascending: false }),
    ]);
    if (ordersRes.error) throw ordersRes.error;
    if (paymentsRes.error) throw paymentsRes.error;

    const payments = paymentsRes.data ?? [];
    const orders = (ordersRes.data ?? []).map((order) => {
      const own = payments.filter((p) => p.order_id === order.id);
      const paid = own.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
      const total = Number(order.total ?? 0);
      return {
        id: order.id,
        customerName: order.customer_name,
        contact: order.contact,
        eventDate: order.event_date,
        eventTime: order.event_time,
        headcount: order.headcount,
        location: order.location,
        total,
        status: order.status,
        notes: order.notes,
        paid,
        balance: total - paid,
        payments: own.map((p) => ({
          id: p.id,
          amount: Number(p.amount ?? 0),
          method: p.method,
          paidAt: p.paid_at,
          note: p.note,
        })),
      };
    });

    const active = orders.filter((o) => o.status !== "cancelled");
    return {
      canManage: canManage(restaurant.role),
      orders,
      totals: {
        orders: active.length,
        booked: active.reduce((sum, o) => sum + o.total, 0),
        collected: active.reduce((sum, o) => sum + o.paid, 0),
        outstanding: active.reduce((sum, o) => sum + Math.max(o.balance, 0), 0),
      },
    };
  });

export const saveCateringOrder = createServerFn({ method: "POST" })
  .inputValidator((data: CateringOrderInput) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    if (!data.customerName?.trim()) throw new Error("Customer name is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)) throw new Error("Pick an event date");

    const row = {
      restaurant_id: restaurant.id,
      customer_name: data.customerName.trim(),
      contact: data.contact?.trim() || null,
      event_date: data.eventDate,
      event_time: data.eventTime?.trim() || null,
      headcount: data.headcount ?? null,
      location: data.location?.trim() || null,
      total: Number(data.total ?? 0),
      status: data.status,
      notes: data.notes?.trim() || null,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("catering_orders")
        .update(row)
        .eq("id", data.id)
        .eq("restaurant_id", restaurant.id);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: inserted, error } = await context.supabase
      .from("catering_orders")
      .insert({ ...row, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw error;
    return { id: inserted.id };
  });

export const deleteCateringOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("catering_orders")
      .delete()
      .eq("id", data.id)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { success: true };
  });

export const addCateringPayment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { orderId: string; amount: number; method: string; paidAt: string; note?: string | null }) =>
      data,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    if (!(Number(data.amount) > 0)) throw new Error("Enter an amount");

    const { error } = await context.supabase.from("catering_payments").insert({
      restaurant_id: restaurant.id,
      order_id: data.orderId,
      amount: Number(data.amount),
      method: data.method,
      paid_at: data.paidAt,
      note: data.note?.trim() || null,
      created_by: context.userId,
    });
    if (error) throw error;
    return { success: true };
  });

export const deleteCateringPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("catering_payments")
      .delete()
      .eq("id", data.id)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { success: true };
  });
