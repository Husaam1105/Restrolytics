import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Clock3,
  Copy,
  KeyRound,
  LogIn,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { PageContainer, PageHeader } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { EmptyState, QueryBoundary } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getEmployees, saveEmployee } from "@/lib/payroll.functions";
import { AREA_LABELS, PAY_METHOD_LABELS, money, type PayArea, type PayMethod } from "@/lib/payroll";
import {
  createStaffLogin,
  resetStaffPassword,
  STAFF_EMAIL_DOMAIN,
} from "@/lib/staff-accounts.functions";
import { requireManagerRoute } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/employees")({
  beforeLoad: requireManagerRoute,
  component: EmployeesPage,
  head: () => ({ meta: [{ title: "Employees · Restrolytics" }] }),
});

type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;
type Employee = EmployeesData["employees"][number];

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
  notes: string;
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
  notes: "",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** A readable temporary password, e.g. "maple-river-4821". */
function tempPassword() {
  const words = [
    "basil",
    "maple",
    "river",
    "pepper",
    "olive",
    "cedar",
    "lemon",
    "sage",
    "amber",
    "ember",
    "harbor",
    "willow",
  ];
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0]! % words.length]!;
  const digits = String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 9000));
  return `${pick()}-${pick()}-${digits}`;
}

function suggestUsername(fullName: string) {
  const [first = "", last = ""] = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/);
  return (first + (last ? `.${last[0]}` : "")).slice(0, 32);
}

function EmployeesPage() {
  const fetchEmployees = useServerFn(getEmployees);
  const query = useQuery({ queryKey: ["employees"], queryFn: () => fetchEmployees() });
  const [editing, setEditing] = useState<FormState | null>(null);
  const [loginFor, setLoginFor] = useState<Employee | null>(null);
  const [filter, setFilter] = useState<"all" | PayArea>("all");
  const [search, setSearch] = useState("");

  const employees = useMemo(() => query.data?.employees ?? [], [query.data]);
  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        const areaMatch = filter === "all" || e.area === filter || e.area === "both";
        const term = search.trim().toLowerCase();
        return (
          areaMatch && (!term || `${e.fullName} ${e.position ?? ""}`.toLowerCase().includes(term))
        );
      }),
    [employees, filter, search],
  );
  const linked = employees.filter((e) => e.userId).length;

  const edit = (e: Employee) =>
    setEditing({
      id: e.id,
      fullName: e.fullName,
      area: e.area,
      position: e.position ?? "",
      hourlyRate: String(e.hourlyRate),
      payMethod: e.payMethod,
      tipEligible: e.tipEligible,
      active: e.active,
      phone: e.phone ?? "",
      notes: e.notes ?? "",
    });

  return (
    <PageContainer>
      <PageHeader
        context="People and pay"
        title="Employees"
        description="Pay setup and app logins for everyone on the team."
        actions={
          <Button onClick={() => setEditing(emptyForm)}>
            <UserPlus />
            Add employee
          </Button>
        }
      />

      <QueryBoundary query={query} errorTitle="The team list didn't load">
        {(data) => (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Active employees"
                value={employees.filter((e) => e.active).length}
                icon={<Users />}
                note={`${employees.length} on file`}
              />
              <StatCard
                label="With an app login"
                value={linked}
                icon={<LogIn />}
                tone={employees.length - linked > 0 ? "warning" : "positive"}
                note={
                  employees.length - linked > 0
                    ? `${employees.length - linked} still need one`
                    : "Everyone can sign in"
                }
              />
              <StatCard
                label="Ready for payroll"
                value={employees.filter((e) => e.hourlyRate > 0).length}
                icon={<ShieldCheck />}
                note="Have an hourly rate"
              />
            </div>

            {employees.length === 0 ? (
              <EmptyState
                title="No employees yet"
                description="Add your team to track hours, split tips and run weekly payroll."
                action={
                  <Button onClick={() => setEditing(emptyForm)}>
                    <UserPlus />
                    Add your first employee
                  </Button>
                }
              />
            ) : (
              <section className="surface overflow-hidden">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      className="pl-9"
                      placeholder="Search by name or job"
                      aria-label="Search employees"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <TabsList>
                      <TabsTrigger value="all">Everyone</TabsTrigger>
                      <TabsTrigger value="foh">Front</TabsTrigger>
                      <TabsTrigger value="boh">Kitchen</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="px-4 py-3 font-medium">Employee</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Pay</th>
                        <th className="px-4 py-3 font-medium">App login</th>
                        <th className="px-4 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            Nobody matches that search.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((e) => (
                          <EmployeeRow
                            key={e.id}
                            employee={e}
                            loginEmail={
                              data.logins.find((l) => l.userId === e.userId)?.email ?? null
                            }
                            onEdit={() => edit(e)}
                            onLogin={() => setLoginFor(e)}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                  <span>
                    Showing {filtered.length} of {employees.length}
                  </span>
                  <Link
                    to="/timeclock"
                    className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                  >
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    Time clock
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </QueryBoundary>

      {editing ? <EmployeeDialog form={editing} onClose={() => setEditing(null)} /> : null}
      {loginFor ? (
        <LoginDialog
          employee={loginFor}
          loginEmail={query.data?.logins.find((l) => l.userId === loginFor.userId)?.email ?? null}
          onClose={() => setLoginFor(null)}
        />
      ) : null}
    </PageContainer>
  );
}

function EmployeeRow({
  employee: e,
  loginEmail,
  onEdit,
  onLogin,
}: {
  employee: Employee;
  loginEmail: string | null;
  onEdit: () => void;
  onLogin: () => void;
}) {
  return (
    <tr className={e.active ? undefined : "text-muted-foreground"}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-link">
            {initials(e.fullName)}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {e.fullName}
              {!e.active ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">Inactive</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {e.phone || "No phone on file"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p>{e.position || "Team member"}</p>
        <p className="text-xs text-muted-foreground">{AREA_LABELS[e.area]}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold tabular-nums">{money(e.hourlyRate)}/hr</p>
        <p className="text-xs text-muted-foreground">
          {PAY_METHOD_LABELS[e.payMethod]}
          {e.tipEligible ? ", shares tips" : ""}
        </p>
      </td>
      <td className="px-4 py-3">
        {e.userId ? (
          <>
            <Badge variant="success">Can sign in</Badge>
            <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground">
              {e.username ? `Username: ${e.username}` : loginEmail}
            </p>
          </>
        ) : (
          <Badge variant="outline">No login</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onLogin}>
            <KeyRound />
            {e.userId ? "Login" : "Give access"}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${e.fullName}`} onClick={onEdit}>
            <Pencil />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function EmployeeDialog({ form: initial, onClose }: { form: FormState; onClose: () => void }) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveEmployee);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: form.id,
          fullName: form.fullName,
          area: form.area,
          position: form.position,
          hourlyRate: Number(form.hourlyRate),
          payMethod: form.payMethod,
          tipEligible: form.tipEligible,
          active: form.active,
          phone: form.phone,
          notes: form.notes,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Employee saved" : "Employee added");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-week"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = () => {
    const next: typeof errors = {};
    if (!form.fullName.trim()) next.fullName = "Add their name.";
    const rate = Number(form.hourlyRate);
    if (form.hourlyRate.trim() === "" || !Number.isFinite(rate) || rate < 0 || rate > 1000) {
      next.hourlyRate = "Enter an hourly rate between 0 and 1000.";
    }
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? `Edit ${initial.fullName}` : "Add employee"}</DialogTitle>
          <DialogDescription>
            Pay details are used for payroll. Give them app access afterwards from the list.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="Name" htmlFor="emp-name" error={errors.fullName}>
            <Input
              id="emp-name"
              autoComplete="off"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </Field>
          <Field label="Job title" htmlFor="emp-position">
            <Input
              id="emp-position"
              placeholder="Server, line cook…"
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
            />
          </Field>
          <Field label="Works in" htmlFor="emp-area">
            <Select value={form.area} onValueChange={(v) => set("area", v as PayArea)}>
              <SelectTrigger id="emp-area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AREA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hourly rate ($)" htmlFor="emp-rate" error={errors.hourlyRate}>
            <Input
              id="emp-rate"
              inputMode="decimal"
              placeholder="16.00"
              value={form.hourlyRate}
              onChange={(e) => set("hourlyRate", e.target.value)}
            />
          </Field>
          <Field label="Paid by" htmlFor="emp-pay">
            <Select value={form.payMethod} onValueChange={(v) => set("payMethod", v as PayMethod)}>
              <SelectTrigger id="emp-pay">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAY_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone" htmlFor="emp-phone">
            <Input
              id="emp-phone"
              type="tel"
              autoComplete="off"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes (only managers see these)" htmlFor="emp-notes">
              <Textarea
                id="emp-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <Toggle
              id="emp-tips"
              label="Shares tips"
              checked={form.tipEligible}
              onChange={(v) => set("tipEligible", v)}
            />
            <Toggle
              id="emp-active"
              label="Active"
              checked={form.active}
              onChange={(v) => set("active", v)}
            />
          </div>
          <DialogFooter className="gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : form.id ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoginDialog({
  employee,
  loginEmail,
  onClose,
}: {
  employee: Employee;
  loginEmail: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const create = useServerFn(createStaffLogin);
  const reset = useServerFn(resetStaffPassword);
  const save = useServerFn(saveEmployee);
  const [username, setUsername] = useState(() => suggestUsername(employee.fullName));
  const [password, setPassword] = useState(tempPassword);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<{ username: string; password: string } | null>(null);
  const isStaffLogin =
    Boolean(employee.username) || Boolean(loginEmail?.endsWith(`@${STAFF_EMAIL_DOMAIN}`));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["employees"] });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { employeeId: employee.id, username, password } }),
    onSuccess: (r) => {
      setDone({ username: r.username, password });
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const resetMutation = useMutation({
    mutationFn: () => reset({ data: { employeeId: employee.id, password } }),
    onSuccess: () => setDone({ username: employee.username ?? "", password }),
    onError: (error: Error) => toast.error(error.message),
  });
  const linkMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: employee.id,
          fullName: employee.fullName,
          area: employee.area,
          hourlyRate: employee.hourlyRate,
          payMethod: employee.payMethod,
          tipEligible: employee.tipEligible,
          active: employee.active,
          loginEmail: email,
        },
      }),
    onSuccess: () => {
      toast.success(`${employee.fullName} is linked to ${email}`);
      refresh();
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>App login for {employee.fullName}</DialogTitle>
          <DialogDescription>
            Staff use it to clock in, see their schedule and confirm their pay. They never see sales
            or anyone else's pay.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl bg-success-soft p-4">
              <p className="font-semibold text-success">
                Login ready. Give these to {employee.fullName.split(" ")[0]} in person.
              </p>
              <Credential label="Username" value={done.username} onCopy={copy} />
              <Credential label="Temporary password" value={done.password} onCopy={copy} />
            </div>
            <p className="text-sm text-muted-foreground">
              They sign in at the Restrolytics sign-in page with the username (no email needed),
              then change the password under My hours and details.
            </p>
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : employee.userId ? (
          <div className="space-y-4">
            <p className="text-sm">
              Signs in as <span className="font-semibold">{employee.username ?? loginEmail}</span>.
            </p>
            {isStaffLogin ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  resetMutation.mutate();
                }}
              >
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  onNew={() => setPassword(tempPassword())}
                  label="New temporary password"
                />
                <DialogFooter>
                  <Button type="submit" disabled={resetMutation.isPending || password.length < 8}>
                    {resetMutation.isPending ? "Resetting…" : "Reset password"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                This person signs in with their own email, so they reset their password from the
                sign-in page.
              </p>
            )}
          </div>
        ) : (
          <Tabs defaultValue="username" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="username" className="flex-1">
                Username and password
              </TabsTrigger>
              <TabsTrigger value="email" className="flex-1">
                Their own email
              </TabsTrigger>
            </TabsList>
            <TabsContent value="username">
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
              >
                <Field label="Username" htmlFor="login-username">
                  <Input
                    id="login-username"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  />
                </Field>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  onNew={() => setPassword(tempPassword())}
                  label="Temporary password"
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || username.length < 3 || password.length < 8
                    }
                  >
                    {createMutation.isPending ? "Creating…" : "Create login"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            <TabsContent value="email">
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  linkMutation.mutate();
                }}
              >
                <p className="text-sm text-muted-foreground">
                  Invite them first under{" "}
                  <Link
                    to="/settings/access"
                    className="font-medium text-link underline-offset-4 hover:underline"
                  >
                    Team access
                  </Link>
                  . Once they've signed in, link that email here.
                </p>
                <Field label="Email they signed in with" htmlFor="login-email">
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <DialogFooter>
                  <Button type="submit" disabled={linkMutation.isPending || !email.includes("@")}>
                    {linkMutation.isPending ? "Linking…" : "Link email"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PasswordField({
  value,
  onChange,
  onNew,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onNew: () => void;
  label: string;
}) {
  return (
    <Field
      label={label}
      htmlFor="login-password"
      hint="At least 8 characters. They'll change it after signing in."
    >
      <div className="flex gap-2">
        <Input
          id="login-password"
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onNew}
          aria-label="Generate a new password"
        >
          <RefreshCw />
        </Button>
      </div>
    </Field>
  );
}

function Credential({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 shadow-[var(--shadow-ring)]">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold tabular-nums select-all">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onCopy(value)}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        <Copy />
      </Button>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
