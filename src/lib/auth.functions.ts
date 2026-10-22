import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, restaurant_name, role, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      userId,
      email: context.claims.email as string | undefined,
      profile,
    };
  });

export const createUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { restaurantName?: string; role?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        restaurant_name: data.restaurantName ?? null,
        role: data.role ?? "owner",
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;

    return { ok: true };
  });
