import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");
const orderSchema = z.object({
  id: z.string().uuid().nullish(),
  customerName: z.string().trim().min(1, "Add the customer's name.").max(160),
  contact: z.string().trim().max(200).nullish(),
  eventDate: isoDate,
  eventTime: z.string().trim().max(40).nullish(),
  headcount: z.coerce.number().int("Headcount is a whole number.").min(0).max(100000).nullish(),
  location: z.string().trim().max(300).nullish(),
  total: z.coerce.number().min(0, "The total can't be negative.").max(1_000_000),
  status: z.enum(["quoted", "confirmed", "delivered", "cancelled"]),
  notes: z.string().trim().max(2000).nullish(),
});
const paymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter an amount above zero.").max(1_000_000),
  method: z.enum(["cash", "card", "check", "transfer", "other"]),
  paidAt: isoDate,
  note: z.string().trim().max(500).nullish(),
});

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
  .inputValidator((data: CateringOrderInput) => orderSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const row = {
      restaurant_id: restaurant.id,
      customer_name: data.customerName,
      contact: data.contact || null,
      event_date: data.eventDate,
      event_time: data.eventTime || null,
      headcount: data.headcount ?? null,
      location: data.location || null,
      total: Math.round(data.total * 100) / 100,
      status: data.status,
      notes: data.notes || null,
    };

    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("catering_orders")
        .update(row)
        .eq("id", data.id)
        .eq("restaurant_id", restaurant.id)
        .select("id");
      if (error) throw error;
      if (!updated?.length) throw new Error("That catering order no longer exists.");
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
      paymentSchema.parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { data: order, error: orderError } = await context.supabase
      .from("catering_orders")
      .select("id")
      .eq("id", data.orderId)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw new Error("That catering order isn't in this restaurant.");

    const { error } = await context.supabase.from("catering_payments").insert({
      restaurant_id: restaurant.id,
      order_id: data.orderId,
      amount: Math.round(data.amount * 100) / 100,
      method: data.method,
      paid_at: data.paidAt,
      note: data.note || null,
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
