import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyDetails, saveMyDetails } from "@/lib/my-details.functions";

export function MyDetails() {
  const fetch = useServerFn(getMyDetails);
  const save = useServerFn(saveMyDetails);
  const { data } = useQuery({ queryKey: ["my-details"], queryFn: () => fetch() });
  const [form, setForm] = useState({ email: "", phone: "", address: "" });
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (data) setForm({ email: data.email ?? "", phone: data.phone ?? "", address: data.address ?? "" });
  }, [data]);
  const m = useMutation({ mutationFn: () => save({ data: form }), onSuccess: () => toast.success("Details saved"), onError: (e: Error) => toast.error(e.message) });
  const pw = useMutation({
    mutationFn: async () => { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; },
    onSuccess: () => { setPassword(""); toast.success("Password changed"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>My details</CardTitle>
        <CardDescription>{data?.username ? `Your username is "${data.username}".` : "Keep your contact info up to date."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="md-email">Email</Label><Input id="md-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="md-phone">Contact number</Label><Input id="md-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="md-address">Address</Label><Input id="md-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>Save details</Button>
        <div className="flex flex-wrap items-end gap-3 border-t pt-4">
          <div className="space-y-1.5"><Label htmlFor="md-pw">New password</Label><Input id="md-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button variant="outline" disabled={password.length < 8 || pw.isPending} onClick={() => pw.mutate()}>Change password</Button>
        </div>
      </CardContent>
    </Card>
  );
}
