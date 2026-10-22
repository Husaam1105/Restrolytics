import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getWorkspace } from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ShiftReminder } from "@/components/shift-reminder";
import { RestaurantSwitcher } from "@/components/restaurant-switcher";
import { RestaurantOnboarding } from "@/components/restaurant-onboarding";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fetchWorkspace = useServerFn(getWorkspace);

  const { data: workspace, isPending } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => fetchWorkspace(),
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
    toast.success("Signed out");
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your restaurants…</p>
      </div>
    );
  }

  if (!workspace || workspace.restaurants.length === 0) {
    return <RestaurantOnboarding email={workspace?.email ?? user.email ?? null} />;
  }

  return (
    <SidebarProvider>
      <AppSidebar role={workspace.role} />
      <SidebarInset>
        <header className="sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b bg-background/90 px-3 backdrop-blur-md sm:gap-4 sm:px-4 lg:px-6">
          <SidebarTrigger className="shrink-0" />
          <div className="contents">
            <RestaurantSwitcher
              restaurants={workspace.restaurants}
              activeId={workspace.activeId}
            />
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden max-w-[200px] truncate text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sign out">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </header>
        <ShiftReminder />
        <div className="flex-1 bg-surface-subtle">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
