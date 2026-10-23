import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addCateringPayment,
  deleteCateringOrder,
  deleteCateringPayment,
  getCatering,
  saveCateringOrder,
} from "@/lib/catering.functions";
import {
  CATERING_STATUSES,
  PAYMENT_METHODS,
  methodLabel,
  money,
  statusLabel,
} from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/sales/catering")({
  component: CateringPage,
  head: () => ({
    meta: [
      { title: "Catering orders & payments · Restrolytics" },
      {
        name: "description",
        content: "Book catering events, track deposits and payments, and see what is still owed.",
      },
    ],
  }),
});

const emptyOrder = {
  id: null as string | null,
  customerName: "",
  contact: "",
  eventDate: "",
  eventTime: "",
  headcount: "",
  location: "",
  total: "",
  status: "quoted",
  notes: "",
};

function CateringPage() {
  const queryClient = useQueryClient();
  const fetchCatering = useServerFn(getCatering);
  const saveOrder = useServerFn(saveCateringOrder);
  const removeOrder = useServerFn(deleteCateringOrder);
  const addPayment = useServerFn(addCateringPayment);
  const removePayment = useServerFn(deleteCateringPayment);

  const { data } = useQuery({ queryKey: ["catering"], queryFn: () => fetchCatering() });
  const [form, setForm] = useState(emptyOrder);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payment, setPayment] = useState({
    amount: "",
    method: "cash",
    paidAt: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["catering"] });

  const orderMutation = useMutation({
    mutationFn: () =>
      saveOrder({
        data: {
          id: form.id,
          customerName: form.customerName,
          contact: form.contact,
          eventDate: form.eventDate,
          eventTime: form.eventTime,
          headcount: form.headcount ? Number(form.headcount) : null,
          location: form.location,
          total: Number(form.total || 0),
          status: form.status,
          notes: form.notes,
        },
      }),
    onSuccess: async () => {
      setForm(emptyOrder);
      await invalidate();
      toast.success("Catering order saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => removeOrder({ data: { id } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Order removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const paymentMutation = useMutation({
    mutationFn: (orderId: string) =>
      addPayment({
        data: {
          orderId,
          amount: Number(payment.amount || 0),
          method: payment.method,
          paidAt: payment.paidAt,
          note: payment.note,
        },
      }),
    onSuccess: async () => {
      setPayment((prev) => ({ ...prev, amount: "", note: "" }));
      setPayFor(null);
      await invalidate();
      toast.success("Payment recorded");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => removePayment({ data: { id } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const canManage = data?.canManage ?? false;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Events" value={String(data?.totals.orders ?? 0)} />
        <Tile label="Booked" value={money(data?.totals.booked ?? 0)} />
        <Tile label="Collected" value={money(data?.totals.collected ?? 0)} />
        <Tile label="Still owed" value={money(data?.totals.outstanding ?? 0)} />
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> {form.id ? "Edit catering order" : "New catering order"}
            </CardTitle>
            <CardDescription>Customer, event details and the agreed total.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer">
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Sharma family"
                />
              </Field>
              <Field label="Phone or email">
                <Input
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  placeholder="555-0134"
                />
              </Field>
              <Field label="Event date">
                <Input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </Field>
              <Field label="Time">
                <Input
                  value={form.eventTime}
                  onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                  placeholder="6:00 PM"
                />
              </Field>
              <Field label="Guests">
                <Input
                  inputMode="numeric"
                  value={form.headcount}
                  onChange={(e) => setForm({ ...form, headcount: e.target.value })}
                  placeholder="40"
                />
              </Field>
              <Field label="Where">
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Community hall"
                />
              </Field>
              <Field label="Total">
                <Input
                  inputMode="decimal"
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                  placeholder="1200"
                />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATERING_STATUSES.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Menu, allergies, delivery instructions"
              />
            </Field>
            <div className="flex gap-2">
              <Button
                disabled={!form.customerName.trim() || !form.eventDate || orderMutation.isPending}
                onClick={() => orderMutation.mutate()}
              >
                {orderMutation.isPending ? "Saving…" : form.id ? "Save changes" : "Add order"}
              </Button>
              {form.id && (
                <Button variant="ghost" onClick={() => setForm(emptyOrder)}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catering orders</CardTitle>
          <CardDescription>Newest event first, with payments underneath.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.orders.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No catering orders yet{canManage ? " — add the first one above." : "."}
            </p>
          ) : null}

          {(data?.orders ?? []).map((order) => (
            <div key={order.id} className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {order.customerName}
                    <Badge variant={order.status === "cancelled" ? "secondary" : "default"}>
                      {statusLabel(order.status)}
                    </Badge>
                    {order.balance > 0 && order.status !== "cancelled" ? (
                      <Badge variant="destructive">{money(order.balance)} owed</Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.eventDate}
                    {order.eventTime ? ` · ${order.eventTime}` : ""}
                    {order.headcount ? ` · ${order.headcount} guests` : ""}
                    {order.location ? ` · ${order.location}` : ""}
                    {order.contact ? ` · ${order.contact}` : ""}
                  </p>
                  {order.notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{order.notes}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{money(order.total)}</p>
                  <p className="text-xs text-muted-foreground">{money(order.paid)} paid</p>
                </div>
              </div>

              {order.payments.length > 0 && (
                <div className="space-y-1 rounded bg-muted/50 p-2">
                  {order.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {p.paidAt} · {methodLabel(p.method)} · {money(p.amount)}
                        {p.note ? ` · ${p.note}` : ""}
                      </span>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deletePaymentMutation.mutate(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPayFor(payFor === order.id ? null : order.id)}
                  >
                    Record payment
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        id: order.id,
                        customerName: order.customerName,
                        contact: order.contact ?? "",
                        eventDate: order.eventDate,
                        eventTime: order.eventTime ?? "",
                        headcount: order.headcount ? String(order.headcount) : "",
                        location: order.location ?? "",
                        total: String(order.total),
                        status: order.status,
                        notes: order.notes ?? "",
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteOrderMutation.mutate(order.id)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4 text-destructive" /> Remove
                  </Button>
                </div>
              )}

              {canManage && payFor === order.id && (
                <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-4">
                  <Field label="Amount">
                    <Input
                      inputMode="decimal"
                      value={payment.amount}
                      onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                      placeholder={String(Math.max(order.balance, 0))}
                    />
                  </Field>
                  <Field label="Method">
                    <Select
                      value={payment.method}
                      onValueChange={(value) => setPayment({ ...payment, method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Date">
                    <Input
                      type="date"
                      value={payment.paidAt}
                      onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })}
                    />
                  </Field>
                  <Field label="Note">
                    <Input
                      value={payment.note}
                      onChange={(e) => setPayment({ ...payment, note: e.target.value })}
                      placeholder="Deposit"
                    />
                  </Field>
                  <div className="sm:col-span-4">
                    <Button
                      size="sm"
                      disabled={paymentMutation.isPending}
                      onClick={() => paymentMutation.mutate(order.id)}
                    >
                      {paymentMutation.isPending ? "Saving…" : "Save payment"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
