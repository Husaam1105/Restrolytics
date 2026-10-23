import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { PageContainer, PageHeader } from "@/components/page";
import { SALES_CHANNELS } from "@/lib/sales";
import { cn } from "@/lib/utils";
import { requireManagerRoute } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/sales")({
  beforeLoad: requireManagerRoute,
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
    <PageContainer>
      <PageHeader title="Sales" description="Totals across every channel, and the detail behind each one." />

      <nav aria-label="Sales channels" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-xl bg-muted p-1">
          {tabs.map((tab) => {
            const active = tab.to === "/sales" ? path === "/sales" : path.startsWith(tab.to);
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-9 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors",
                    active ? "bg-card text-foreground shadow-[var(--shadow-ring),var(--shadow-xs)]" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Outlet />
    </PageContainer>
  );
}
