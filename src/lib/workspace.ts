import { queryOptions, useQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { localNow } from "./operating-day";
import { getWorkspace } from "./tenant.functions";

/** The signed-in user's restaurants and role. Shared by the app shell and route guards. */
export const workspaceQuery = queryOptions({
  queryKey: ["workspace"],
  queryFn: () => getWorkspace(),
  staleTime: 60_000,
});

export type Workspace = Awaited<ReturnType<typeof getWorkspace>>;

export function isManagerRole(role: Workspace["role"]) {
  return role === "owner" || role === "manager";
}

/**
 * `beforeLoad` guard for owner/manager pages. Staff are sent to the dashboard
 * instead of seeing a page whose data the server will refuse anyway.
 */
export async function requireManagerRoute({ context }: { context: { queryClient: QueryClient } }) {
  const workspace = await context.queryClient.ensureQueryData(workspaceQuery);
  if (!isManagerRole(workspace.role)) throw redirect({ to: "/dashboard" });
}

/**
 * The active restaurant's calendar: its timezone, pay-week start, and today's
 * date there (not in the browser's timezone). Use it for every date preset.
 */
export function useRestaurantClock() {
  const { data } = useQuery(workspaceQuery);
  const timezone = data?.timezone ?? "America/New_York";
  return { timezone, weekStartsOn: data?.weekStartsOn ?? 1, today: localNow(timezone).date };
}
