import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Staff without a real email sign in as `<username>@kaizr.staff` (see AGENTS.md). */
export const STAFF_EMAIL_DOMAIN = "kaizr.staff";

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, "Use 3–32 letters, numbers, dots, dashes or underscores, starting with a letter or number.");
const password = z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters.");

async function employeeInRestaurant(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
  employeeId: string,
) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, user_id, username")
    .eq("id", employeeId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("That employee isn't on this restaurant's team.");
  return data;
}

/** Manager creates a username + password login for an employee who has no email. */
export const createStaffLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { employeeId: string; username: string; password: string }) =>
    z.object({ employeeId: z.string().uuid(), username, password }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const employee = await employeeInRestaurant(context.supabase, restaurant.id, data.employeeId);
    if (employee.user_id) throw new Error(`${employee.full_name} already has a login.`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = `${data.username}@${STAFF_EMAIL_DOMAIN}`;

    const { data: taken } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("username", data.username)
      .limit(1);
    if (taken?.length) throw new Error(`The username "${data.username}" is taken. Try adding a number or last initial.`);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: employee.full_name },
      // Server-only (users can't edit app_metadata): which restaurant owns this login.
      app_metadata: { staff_login: true, home_restaurant_id: restaurant.id },
    });
    if (createError || !created.user) {
      if (createError?.message.toLowerCase().includes("already")) {
        throw new Error(`The username "${data.username}" is taken. Try adding a number or last initial.`);
      }
      throw createError ?? new Error("The login couldn't be created.");
    }

    const userId = created.user.id;
    try {
      const { error: memberError } = await supabaseAdmin.from("restaurant_members").insert({
        restaurant_id: restaurant.id,
        user_id: userId,
        email,
        role: "staff",
        invited_by: context.userId,
      });
      if (memberError) throw memberError;

      const { error: linkError } = await supabaseAdmin
        .from("employees")
        .update({ user_id: userId, username: data.username })
        .eq("id", employee.id)
        .eq("restaurant_id", restaurant.id);
      if (linkError) throw linkError;

      await supabaseAdmin.from("profiles").upsert(
        { user_id: userId, active_restaurant_id: restaurant.id, role: "staff", full_name: employee.full_name },
        { onConflict: "user_id" },
      );
    } catch (error) {
      // Don't leave a half-created account behind.
      await supabaseAdmin.from("restaurant_members").delete().eq("user_id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw error;
    }

    return { username: data.username };
  });

/** Manager sets a new password for a staff username login (not for email accounts). */
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { employeeId: string; password: string }) =>
    z.object({ employeeId: z.string().uuid(), password }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const employee = await employeeInRestaurant(context.supabase, restaurant.id, data.employeeId);
    if (!employee.user_id) throw new Error(`${employee.full_name} doesn't have a login yet.`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(employee.user_id);
    if (userError || !user.user) throw userError ?? new Error("That login no longer exists.");
    if (!user.user.email?.endsWith(`@${STAFF_EMAIL_DOMAIN}`)) {
      throw new Error("This person signs in with their own email. They can reset it from the sign-in page.");
    }
    const home = (user.user.app_metadata as { home_restaurant_id?: string } | undefined)?.home_restaurant_id;
    if (home !== restaurant.id) {
      throw new Error("This login was created by another restaurant, so only they can reset it.");
    }

    // A username login belongs to exactly one restaurant, as staff.
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("restaurant_members")
      .select("restaurant_id, role")
      .eq("user_id", employee.user_id);
    if (rolesError) throw rolesError;
    if (roles?.length !== 1 || roles[0]!.restaurant_id !== restaurant.id || roles[0]!.role !== "staff") {
      throw new Error("You can only reset passwords for staff logins on this team.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(employee.user_id, { password: data.password });
    if (error) throw error;
    return { ok: true };
  });
