import { queryOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

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
