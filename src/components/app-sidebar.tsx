import { Link, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  Headset,
  Bike,
  ChefHat,
  Clock,
  IdCard,
  LayoutDashboard,
  BrainCircuit,
  Timer,
  Truck,
  Warehouse,
  Gauge,
  Megaphone,
  MoonStar,
  Package,
  Plug,
  Receipt,
  Settings,
  Sunrise,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
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

const shiftChildren = [
  { title: "Time clock", url: "/timeclock", icon: Timer },
  { title: "Front of house", url: "/foh", icon: Sunrise },
  { title: "Kitchen staff", url: "/boh", icon: ChefHat },
  { title: "Schedule", url: "/shifts", icon: MoonStar },
];

const copilotChildren = [
  { title: "Ask IQ", url: "/copilot", icon: BrainCircuit },
  { title: "Live manager", url: "/copilot/manager", icon: Headset },
];

const inventoryChildren = [
  { title: "Overview", url: "/inventory", icon: Gauge },
  { title: "Vendors", url: "/inventory/vendors", icon: Truck },
  { title: "Storage areas", url: "/inventory/storage", icon: Warehouse },
];

const salesChildren = [
  { title: "Toast POS", url: "/sales/toast", icon: Receipt },
  { title: "Uber Eats", url: "/sales/ubereats", icon: Bike },
  { title: "DoorDash", url: "/sales/doordash", icon: Bike },
  { title: "Grubhub", url: "/sales/grubhub", icon: Bike },
  { title: "Catering", url: "/sales/catering", icon: UtensilsCrossed },
];

const settingsChildren = [
  { title: "Employees & access", url: "/settings/access", icon: Users },
  { title: "Integrations", url: "/settings/integrations", icon: Plug },
];

function buildNav(role?: string | null) {
  const isManager = role === "owner" || role === "manager";

  const main: Array<{
    title: string;
    url: string;
    icon: typeof LayoutDashboard;
    children?: typeof shiftChildren;
  }> = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "IQ Copilot", url: "/copilot", icon: BrainCircuit, children: copilotChildren },
    { title: "Sales", url: "/sales", icon: Receipt, children: salesChildren },
    { title: "Inventory", url: "/inventory", icon: Package, children: inventoryChildren },
    { title: "Marketing", url: "/marketing", icon: Megaphone },
    { title: "Shifts", url: "/shifts", icon: Clock, children: shiftChildren },
  ];

  const people: Array<{ title: string; url: string; icon: typeof LayoutDashboard }> = [];
  if (isManager) {
    people.unshift(
      { title: "Employees", url: "/employees", icon: IdCard },
      { title: "Payroll", url: "/payroll", icon: Banknote },
    );
  }

  const settings = isManager
    ? [{ title: "Settings", url: "/settings", icon: Settings, children: settingsChildren }]
    : [];

  return { main, people, settings };
}

export function AppSidebar({ role }: { role?: string | null }) {
  const { main, people, settings } = buildNav(role);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  const isActive = (path: string) =>
    currentPath === path || (path !== "/" && currentPath.startsWith(path));

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="px-3 pt-4">
        <div className="flex items-center gap-2 px-1 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </div>
          {!collapsed && <span className="font-display text-lg font-semibold">Restrolytics</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                  {item.children && !collapsed && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.url}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={child.url === "/inventory" || child.url === "/copilot" ? currentPath === child.url : isActive(child.url)}
                          >
                            <Link
                              to={child.url}
                              className="flex items-center gap-2"
                            >
                              <child.icon className="h-3.5 w-3.5 shrink-0" />
                              <span>{child.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {people.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>People &amp; pay</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {people.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {settings.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settings.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                    {item.children && !collapsed && (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.url}>
                            <SidebarMenuSubButton asChild isActive={child.url === "/inventory" || child.url === "/copilot" ? currentPath === child.url : isActive(child.url)}>
                              <Link to={child.url} className="flex items-center gap-2">
                                <child.icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{child.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
