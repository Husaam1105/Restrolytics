import { Link, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  BrainCircuit,
  ChefHat,
  ClipboardCheck,
  Gauge,
  Headset,
  IdCard,
  LayoutDashboard,
  MonitorCog,
  Package,
  Plug,
  Receipt,
  CalendarDays,
  ConciergeBell,
  ShieldCheck,
  Timer,
  Truck,
  UtensilsCrossed,
  Warehouse,
  Bike,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand-mark";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Match only this exact path (for section roots that are also a child). */
  exact?: boolean;
  children?: NavItem[];
};

type NavGroup = { label?: string; items: NavItem[] };

function buildNav(role: string | null | undefined, isPlatformStaff: boolean): NavGroup[] {
  const isManager = role === "owner" || role === "manager";

  const iq: NavItem = {
    title: "IQ Copilot",
    url: "/copilot",
    icon: BrainCircuit,
    children: [
      { title: "Ask IQ", url: "/copilot", icon: BrainCircuit, exact: true },
      { title: "Live manager", url: "/copilot/manager", icon: Headset },
    ],
  };

  const shiftWork: NavItem[] = [
    { title: "Time clock", url: "/timeclock", icon: Timer },
    { title: "Front of house", url: "/foh", icon: ConciergeBell },
    { title: "Kitchen", url: "/boh", icon: ChefHat },
    { title: "Schedule", url: "/shifts", icon: CalendarDays },
  ];

  if (!isManager) {
    // Staff see what their shift needs, nothing they can't use.
    return [
      {
        items: [
          { title: "Today", url: "/dashboard", icon: LayoutDashboard },
          ...shiftWork,
          { title: "Stock counts", url: "/inventory/storage", icon: Warehouse },
          iq,
        ],
      },
    ];
  }

  const groups: NavGroup[] = [
    {
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        iq,
        {
          title: "Sales",
          url: "/sales",
          icon: Receipt,
          children: [
            { title: "Overview", url: "/sales", icon: Gauge, exact: true },
            { title: "Toast POS", url: "/sales/toast", icon: Receipt },
            { title: "Uber Eats", url: "/sales/ubereats", icon: Bike },
            { title: "DoorDash", url: "/sales/doordash", icon: Bike },
            { title: "Grubhub", url: "/sales/grubhub", icon: Bike },
            { title: "Catering", url: "/sales/catering", icon: UtensilsCrossed },
          ],
        },
        {
          title: "Inventory",
          url: "/inventory",
          icon: Package,
          children: [
            { title: "Overview", url: "/inventory", icon: Gauge, exact: true },
            { title: "Vendors", url: "/inventory/vendors", icon: Truck },
            { title: "Storage and counts", url: "/inventory/storage", icon: Warehouse },
          ],
        },
        {
          title: "Shifts",
          url: "/shifts",
          icon: ClipboardCheck,
          children: shiftWork,
        },
      ],
    },
    {
      label: "People and pay",
      items: [
        { title: "Employees", url: "/employees", icon: IdCard },
        { title: "Payroll", url: "/payroll", icon: Banknote },
      ],
    },
    {
      label: "Settings",
      items: [
        { title: "Team access", url: "/settings/access", icon: ShieldCheck },
        { title: "Integrations", url: "/settings/integrations", icon: Plug },
      ],
    },
  ];

  if (isPlatformStaff) {
    groups.push({
      label: "Restrolytics",
      items: [{ title: "Manager console", url: "/manager-console", icon: MonitorCog }],
    });
  }
  return groups;
}

export function AppSidebar({
  role,
  isPlatformStaff = false,
}: {
  role?: string | null;
  isPlatformStaff?: boolean;
}) {
  const groups = buildNav(role, isPlatformStaff);
  const { state, isMobile, setOpenMobile } = useSidebar();
  // The mobile drawer always shows labels, whatever the desktop collapse state.
  const collapsed = state === "collapsed" && !isMobile;
  const path = useRouterState({ select: (router) => router.location.pathname });

  const matches = (item: NavItem) =>
    item.exact ? path === item.url : path === item.url || path.startsWith(`${item.url}/`);
  const sectionActive = (item: NavItem) => matches(item) || Boolean(item.children?.some(matches));
  const close = () => isMobile && setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link
          to="/dashboard"
          onClick={close}
          className="flex items-center rounded-lg px-1 py-2"
          aria-label="Restrolytics dashboard"
        >
          <BrandMark wordmarkClassName={collapsed ? "sr-only" : "text-sidebar-foreground"} />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group, i) => (
          <SidebarGroup key={group.label ?? i}>
            {group.label ? (
              <SidebarGroupLabel className="text-sidebar-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = sectionActive(item);
                  return (
                    <SidebarMenuItem key={item.url + item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active && !item.children}
                        tooltip={item.title}
                      >
                        <Link
                          to={item.url}
                          onClick={close}
                          aria-current={matches(item) && !item.children ? "page" : undefined}
                          className={active ? "font-semibold" : undefined}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.children && active && !collapsed ? (
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.url + child.title}>
                              <SidebarMenuSubButton asChild isActive={matches(child)}>
                                <Link
                                  to={child.url}
                                  onClick={close}
                                  aria-current={matches(child) ? "page" : undefined}
                                >
                                  <span>{child.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-4 pb-4 text-xs text-sidebar-muted-foreground group-data-[collapsible=icon]:hidden">
        Need help? Ask your Restrolytics manager under IQ Copilot.
      </SidebarFooter>
    </Sidebar>
  );
}
