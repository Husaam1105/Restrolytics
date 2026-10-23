import type { SupabaseClient } from "@supabase/supabase-js";

export type MemberRole = "owner" | "manager" | "staff";

export type ActiveRestaurant = {
  id: string;
  name: string;
  settings: unknown;
  role: MemberRole;
};

export type RestaurantOption = { id: string; name: string; role: MemberRole };

type MembershipRow = {
  role: MemberRole;
  restaurant_id: string;
  created_at: string;
  restaurants: { id: string; name: string; location: string | null; settings: unknown } | null;
};

export class NoRestaurantError extends Error {
  constructor() {
    super("NO_RESTAURANT");
    this.name = "NoRestaurantError";
  }
}

/** Every restaurant the signed-in user belongs to, oldest membership first. */
export async function listMemberships(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("restaurant_members")
    .select("role, restaurant_id, created_at, restaurants(id, name, location, settings)")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return ((data ?? []) as unknown as MembershipRow[]).filter((m) => m.restaurants);
}

/**
 * Resolves which restaurant the user is currently working in: their saved
 * selection when they still belong to it, otherwise their first membership.
 */
export async function resolveActiveRestaurant(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveRestaurant> {
  const memberships = await listMemberships(supabase, userId);
  if (memberships.length === 0) throw new NoRestaurantError();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_restaurant_id")
    .eq("user_id", userId)
    .maybeSingle();

  const preferred =
    memberships.find((m) => m.restaurant_id === profile?.active_restaurant_id) ?? memberships[0]!;

  return {
    id: preferred.restaurants!.id,
    name: preferred.restaurants!.name,
    settings: preferred.restaurants!.settings,
    role: preferred.role,
  };
}

export function canManage(role: MemberRole) {
  return role === "owner" || role === "manager";
}

export async function requireManager(supabase: SupabaseClient, userId: string) {
  const restaurant = await resolveActiveRestaurant(supabase, userId);
  if (!canManage(restaurant.role)) {
    throw new Error("Only owners and managers can change this.");
  }
  return restaurant;
}

/**
 * Turns any pending email invitations for this user into real memberships.
 * Runs with elevated access because the invited user is not a member yet.
 */
export async function claimPendingInvites(userId: string, email: string | undefined) {
  if (!email) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = email.trim().toLowerCase();
  // Username logins only ever join the restaurant that created them.
  if (normalized.endsWith("@kaizr.staff")) return 0;

  const { data: invites } = await supabaseAdmin
    .from("restaurant_invites")
    .select("id, restaurant_id, role")
    .eq("email", normalized)
    .is("accepted_at", null);

  if (!invites || invites.length === 0) return 0;

  for (const invite of invites) {
    await supabaseAdmin.from("restaurant_members").upsert(
      {
        restaurant_id: invite.restaurant_id,
        user_id: userId,
        email: normalized,
        role: invite.role,
      },
      { onConflict: "restaurant_id,user_id" },
    );
    await supabaseAdmin
      .from("restaurant_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
  }

  return invites.length;
}
