import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock3, LogIn, Pencil, Search, ShieldCheck, UserPlus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmployees, saveEmployee } from "@/lib/payroll.functions";
import { AREA_LABELS, PAY_METHOD_LABELS, money, type PayArea, type PayMethod } from "@/lib/payroll";

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeesPage,
  head: () => ({
    meta: [
      { title: "Employees & logins — Restaurant CRM" },
      { name: "description", content: "Manage restaurant employees, pay rates, access, and payroll setup." },
      { property: "og:title", content: "Employees & logins — Restaurant CRM" },
      { property: "og:description", content: "Manage restaurant employees, pay rates, access, and payroll setup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type FormState = {
  id: string | null;
  fullName: string;
  area: PayArea;
  position: string;
  hourlyRate: string;
  payMethod: PayMethod;
  tipEligible: boolean;
  active: boolean;
  phone: string;
  loginEmail: string;
};

const emptyForm: FormState = {
  id: null,
  fullName: "",
  area: "foh",
  position: "",
  hourlyRate: "",
  payMethod: "cash",
  tipEligible: true,
  active: true,
  phone: "",
  loginEmail: "",
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function EmployeesPage() {
  const queryClient = useQueryClient();
  const fetchEmployees = useServerFn(getEmployees);
  const save = useServerFn(saveEmployee);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | PayArea>("all");
  const [search, setSearch] = useState("");
  const { data } = useQuery({ queryKey: ["employees"], queryFn: () => fetchEmployees() });

  const mutation = useMutation({
    mutationFn: () => save({ data: {
      id: form.id,
      fullName: form.fullName,
      area: form.area,
      position: form.position,
      hourlyRate: Number(form.hourlyRate) || 0,
      payMethod: form.payMethod,
      tipEligible: form.tipEligible,
      active: form.active,
      phone: form.phone,
      loginEmail: form.loginEmail,
    } }),
    onSuccess: () => {
      toast.success(form.id ? "Employee updated" : "Employee added");
      setForm(emptyForm);
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-week"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const employees = data?.employees ?? [];
  const filtered = useMemo(() => employees.filter((employee) => {
    const areaMatch = filter === "all" || employee.area === filter || employee.area === "both";
    const term = search.trim().toLowerCase();
    return areaMatch && (!term || `${employee.fullName} ${employee.position ?? ""}`.toLowerCase().includes(term));
  }), [employees, filter, search]);
  const linked = employees.filter((employee) => employee.userId).length;

  const edit = (employee: (typeof employees)[number]) => {
    const login = data?.logins.find((item) => item.userId === employee.userId);
    setForm({
      id: employee.id,
      fullName: employee.fullName,
      area: employee.area,
      position: employee.position ?? "",
      hourlyRate: String(employee.hourlyRate),
      payMethod: employee.payMethod,
      tipEligible: employee.tipEligible,
      active: employee.active,
      phone: employee.phone ?? "",
      loginEmail: login?.email ?? "",
    });
    setDialogOpen(true);
  };

  if (data && !data.canManage) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-center"><h1 className="text-xl font-semibold">Employees</h1><p className="mt-2 text-sm text-muted-foreground">Only owners and managers can see the staff list.</p></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
      <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">People & pay</p>
          <h1 className="truncate text-3xl font-bold">Staff directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Employee records, pay setup, and individual app access.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setForm(emptyForm); setDialogOpen(true); }}><UserPlus className="mr-2 size-4" />Add employee</Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Users} label="Active employees" value={String(employees.filter((e) => e.active).length)} detail={`${employees.length} total`} />
        <Metric icon={LogIn} label="App logins linked" value={String(linked)} detail={`${Math.max(0, employees.length - linked)} need access`} />
        <Metric icon={ShieldCheck} label="Payroll ready" value={String(employees.filter((e) => e.hourlyRate > 0).length)} detail="with a pay rate" />
      </section>

      <section className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <div className="grid gap-4 border-b p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="relative min-w-0"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by employee or job…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="foh">FOH</TabsTrigger><TabsTrigger value="boh">BOH</TabsTrigger></TabsList></Tabs>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 font-semibold">Employee</th><th className="px-4 py-3 font-semibold">Area & role</th><th className="px-4 py-3 font-semibold">Pay</th><th className="px-4 py-3 font-semibold">Login</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No employees match this view.</td></tr> : filtered.map((employee) => {
                const login = data?.logins.find((item) => item.userId === employee.userId);
                return <tr key={employee.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">{initials(employee.fullName)}</div><div className="min-w-0"><p className="font-semibold">{employee.fullName}</p><p className="truncate text-xs text-muted-foreground">{employee.phone || "No phone"}</p></div></div></td>
                  <td className="px-4 py-3"><p>{employee.position || "Team member"}</p><p className="text-xs text-muted-foreground">{AREA_LABELS[employee.area]}</p></td>
                  <td className="px-4 py-3"><p className="font-mono font-semibold">{money(employee.hourlyRate)}/hr</p><p className="text-xs text-muted-foreground">{PAY_METHOD_LABELS[employee.payMethod]}{employee.tipEligible ? " · Tips" : ""}</p></td>
                  <td className="px-4 py-3">{login ? <><Badge className="bg-success text-success-foreground">Linked</Badge><p className="mt-1 max-w-48 truncate text-xs text-muted-foreground">{login.email}</p></> : <><Badge variant="outline">Not linked</Badge><p className="mt-1 text-xs text-muted-foreground">No staff login</p></>}</td>
                  <td className="px-4 py-3"><Badge variant={employee.active ? "secondary" : "outline"}>{employee.active ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" aria-label={`Edit ${employee.fullName}`} onClick={() => edit(employee)}><Pencil className="size-4" /></Button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{filtered.length} employees shown</span><Link to="/timeclock" className="inline-flex items-center gap-1 font-medium text-foreground"><Clock3 className="size-3.5" />Open time clock</Link></div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit employee" : "Add employee"}</DialogTitle><DialogDescription>Set their payroll record and optionally link their personal login.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Employee name" /></Field>
            <Field label="Job title"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Server, line cook…" /></Field>
            <Field label="Works in"><Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v as PayArea })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(AREA_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Hourly rate"><Input inputMode="decimal" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder="16.00" /></Field>
            <Field label="Paid by"><Select value={form.payMethod} onValueChange={(v) => setForm({ ...form, payMethod: v as PayMethod })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PAY_METHOD_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Login email"><Input type="email" value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} placeholder="Must already be invited" /></Field>
            <div className="flex items-end gap-6 pb-2"><Toggle label="Shares tips" checked={form.tipEligible} onChange={(checked) => setForm({ ...form, tipEligible: checked })} /><Toggle label="Active" checked={form.active} onChange={(checked) => setForm({ ...form, active: checked })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.fullName.trim()}>{mutation.isPending ? "Saving…" : "Save employee"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string; detail: string }) {
  return <div className="rounded-lg border bg-card p-4 shadow-xs"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><Icon className="size-4 text-muted-foreground" /></div><div className="mt-2 flex items-baseline gap-2"><span className="font-mono text-2xl font-bold">{value}</span><span className="text-xs text-muted-foreground">{detail}</span></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center gap-2"><Switch checked={checked} onCheckedChange={onChange} /><Label>{label}</Label></div>;
}