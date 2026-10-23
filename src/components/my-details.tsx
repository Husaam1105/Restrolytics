import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyDetails, saveMyDetails } from "@/lib/my-details.functions";

/** Staff keep their own contact details and password up to date. */
export function MyDetails() {
  const fetch = useServerFn(getMyDetails);
  const save = useServerFn(saveMyDetails);
  const { data } = useQuery({ queryKey: ["my-details"], queryFn: () => fetch() });
  const [form, setForm] = useState({ email: "", phone: "", address: "" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (data) setForm({ email: data.email ?? "", phone: data.phone ?? "", address: data.address ?? "" });
  }, [data]);

  const details = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => toast.success("Details saved"),
    onError: (e: Error) => toast.error(e.message),
  });
  const pw = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      setPassword("");
      setConfirm("");
      toast.success("Password changed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <section className="surface space-y-6 p-5 sm:p-6" aria-labelledby="my-details-heading">
      <SectionHeader
        title={<span id="my-details-heading">My details</span>}
        description={data?.username ? `You sign in with the username "${data.username}".` : "Your manager uses these to reach you."}
      />
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          details.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="md-email">Email</Label>
          <Input id="md-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="md-phone">Phone</Label>
          <Input id="md-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="md-address">Address</Label>
          <Input id="md-address" autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <Button type="submit" disabled={details.isPending}>
            {details.isPending ? "Saving…" : "Save details"}
          </Button>
        </div>
      </form>

      <form
        className="grid gap-4 border-t pt-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!mismatch) pw.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="md-pw">New password</Label>
          <Input id="md-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="md-pw2">Type it again</Label>
          <Input id="md-pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {mismatch ? (
            <p role="alert" className="text-sm text-destructive">
              The passwords don&apos;t match.
            </p>
          ) : null}
        </div>
        <div>
          <Button type="submit" variant="outline" disabled={password.length < 8 || mismatch || !confirm || pw.isPending}>
            {pw.isPending ? "Changing…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
