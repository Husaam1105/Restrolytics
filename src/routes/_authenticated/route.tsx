import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { workspaceQuery } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ShiftReminder } from "@/components/shift-reminder";
import { RestaurantSwitcher } from "@/components/restaurant-switcher";
import { RestaurantOnboarding } from "@/components/restaurant-onboarding";
import { UserMenu } from "@/components/user-menu";

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
  const { data: workspace, isPending, isError, refetch, isRefetching } = useQuery(workspaceQuery);

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

  // A failed load must never look like "you have no restaurants".
  if (isError || !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-xl font-semibold">We couldn't load your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your connection and try again. If it keeps happening, sign out and back in.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => refetch()} disabled={isRefetching}>
              {isRefetching ? "Retrying…" : "Try again"}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (workspace.restaurants.length === 0) {
    return (
      <RestaurantOnboarding
        email={workspace.email ?? user.email ?? null}
        canCreate={workspace.canCreateRestaurant}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <AppSidebar role={workspace.role} isPlatformStaff={workspace.isPlatformStaff} />
      <SidebarInset>
        <header className="sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md sm:gap-4 sm:px-4 lg:px-6">
          <SidebarTrigger className="shrink-0" />
          <div className="contents">
            <RestaurantSwitcher
              restaurants={workspace.restaurants}
              activeId={workspace.activeId}
              canCreate={workspace.canCreateRestaurant}
            />
            <UserMenu
              email={workspace.email ?? user.email ?? null}
              name={workspace.fullName}
              role={workspace.role}
              onSignOut={handleSignOut}
            />
          </div>
        </header>
        <ShiftReminder />
        <main id="main" tabIndex={-1} className="flex-1 bg-surface-subtle outline-none">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
