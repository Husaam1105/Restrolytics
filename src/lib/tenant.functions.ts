import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MemberRole = "owner" | "manager" | "staff";

/** Restaurants this user can access, plus the one currently selected. */
export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listMemberships, claimPendingInvites } = await import("./tenant.server");
    const email = context.claims.email as string | undefined;

    await claimPendingInvites(context.userId, email);

    const memberships = await listMemberships(context.supabase, context.userId);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("active_restaurant_id, full_name")
      .eq("user_id", context.userId)
      .maybeSingle();

    const restaurants = memberships.map((m) => ({
      id: m.restaurants!.id,
      name: m.restaurants!.name,
      location: m.restaurants!.location ?? null,
      role: m.role as MemberRole,
    }));

    const active =
      restaurants.find((r) => r.id === profile?.active_restaurant_id) ?? restaurants[0] ?? null;

    return {
      email: email ?? null,
      fullName: profile?.full_name ?? null,
      restaurants,
      activeId: active?.id ?? null,
      activeName: active?.name ?? null,
      role: active?.role ?? null,
    };
  });

export const createRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; location?: string }) => input)
  .handler(async ({ data, context }) => {
    const name = data.name.trim();
    if (!name) throw new Error("Restaurant name is required.");

    const { data: restaurant, error } = await context.supabase
      .from("restaurants")
      .insert({
        owner_id: context.userId,
        name,
        location: data.location?.trim() || null,
      })
      .select("id, name")
      .single();
    if (error) throw error;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: memberError } = await supabaseAdmin.from("restaurant_members").upsert(
      {
        restaurant_id: restaurant.id,
        user_id: context.userId,
        email: (context.claims.email as string | undefined)?.toLowerCase() ?? null,
        role: "owner",
      },
      { onConflict: "restaurant_id,user_id" },
    );
    if (memberError) throw memberError;

    await context.supabase
      .from("profiles")
      .upsert(
        { user_id: context.userId, active_restaurant_id: restaurant.id, role: "owner" },
        { onConflict: "user_id" },
      );

    // Give the new restaurant its starter FOH/BOH checklists.
    const { allSeedRows } = await import("./shift-defaults");
    await context.supabase.from("shift_tasks").insert(allSeedRows(restaurant.id));

    return restaurant;
  });

export const switchRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { restaurantId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: membership, error } = await context.supabase
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", context.userId)
      .eq("restaurant_id", data.restaurantId)
      .maybeSingle();
    if (error) throw error;
    if (!membership) throw new Error("You don't have access to that restaurant.");

    const { error: updateError } = await context.supabase
      .from("profiles")
      .upsert(
        { user_id: context.userId, active_restaurant_id: data.restaurantId },
        { onConflict: "user_id" },
      );
    if (updateError) throw updateError;

    return { ok: true };
  });

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant, canManage } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);

    const { data: members } = await context.supabase
      .from("restaurant_members")
      .select("id, user_id, email, role, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at");

    const { data: invites } = canManage(restaurant.role)
      ? await context.supabase
          .from("restaurant_invites")
          .select("id, email, role, created_at")
          .eq("restaurant_id", restaurant.id)
          .is("accepted_at", null)
          .order("created_at")
      : { data: [] };

    return {
      restaurantName: restaurant.name,
      role: restaurant.role,
      myUserId: context.userId,
      members: (members ?? []).map((m) => ({
        id: m.id,
        userId: m.user_id,
        email: m.email,
        role: m.role as MemberRole,
        joinedAt: m.created_at,
      })),
      invites: (invites ?? []).map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role as MemberRole,
        createdAt: i.created_at,
      })),
    };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: MemberRole }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (restaurant.role === "manager" && data.role !== "staff") {
      throw new Error("Managers can only invite staff.");
    }

    const { error } = await context.supabase.from("restaurant_invites").upsert(
      {
        restaurant_id: restaurant.id,
        email,
        role: data.role,
        invited_by: context.userId,
        accepted_at: null,
      },
      { onConflict: "restaurant_id,email" },
    );
    if (error) throw error;

    return { ok: true, email };
  });

export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { inviteId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("restaurant_invites")
      .delete()
      .eq("id", data.inviteId);
    if (error) throw error;
    return { ok: true };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string; role: MemberRole }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    if (restaurant.role !== "owner") throw new Error("Only owners can change roles.");

    const { error } = await context.supabase
      .from("restaurant_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);

    const { data: member } = await context.supabase
      .from("restaurant_members")
      .select("id, user_id, role")
      .eq("id", data.memberId)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (!member) throw new Error("Member not found.");
    if (member.user_id === context.userId) throw new Error("You can't remove yourself.");

    const { error } = await context.supabase
      .from("restaurant_members")
      .delete()
      .eq("id", data.memberId);
    if (error) throw error;
    return { ok: true };
  });
