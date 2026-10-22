import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { SALES_CHANNELS } from "@/lib/sales";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesLayout,
});

const tabs = [
  { to: "/sales", label: "Overview" },
  ...SALES_CHANNELS.map((channel) => ({ to: `/sales/${channel.slug}`, label: channel.label })),
  { to: "/sales/catering", label: "Catering" },
];

function SalesLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="border-b pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-coral">Performance</p>
        <h1 className="font-display text-3xl font-bold">Sales</h1>
        <p className="text-sm text-muted-foreground">
          Total sales and the breakdown behind each channel.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-surface-subtle p-1 shadow-xs">
        {tabs.map((tab) => {
          const active = tab.to === "/sales" ? path === "/sales" : path.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-semibold transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
