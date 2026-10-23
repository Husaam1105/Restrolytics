import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPlatformConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveActiveRestaurant } = await import("./tenant.server");
    const restaurant = await resolveActiveRestaurant(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("platform_connections")
      .select("id, platform, status, account_label, last_synced_at, last_error")
      .eq("restaurant_id", restaurant.id);
    if (error) throw error;
    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      connections: data ?? [],
    };
  });

export const connectPlatform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { platform: string; credentials: Record<string, string> }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { validateCredentials, accountLabelFor } = await import("./integrations.server");
    const { cleaned } = validateCredentials(data.platform, data.credentials);

    const { data: connection, error } = await context.supabase
      .from("platform_connections")
      .upsert(
        {
          restaurant_id: restaurant.id,
          platform: data.platform,
          status: "connected",
          account_label: accountLabelFor(data.platform, cleaned),
          last_error: null,
        },
        { onConflict: "restaurant_id,platform" },
      )
      .select("id, platform, status, account_label, last_synced_at, last_error")
      .single();
    if (error) throw error;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: secretError } = await supabaseAdmin.from("platform_connection_secrets").upsert(
      {
        connection_id: connection.id,
        credentials: cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "connection_id" },
    );
    if (secretError) throw secretError;

    return connection;
  });

export const disconnectPlatform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { data: removed, error } = await context.supabase
      .from("platform_connections")
      .delete()
      .eq("id", data.connectionId)
      .eq("restaurant_id", restaurant.id)
      .select("id");
    if (error) throw error;
    if (!removed?.length) throw new Error("That connection doesn't exist.");

    // Secrets are deleted only for the connection we just confirmed and removed.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: secretError } = await supabaseAdmin
      .from("platform_connection_secrets")
      .delete()
      .eq("connection_id", removed[0]!.id);
    if (secretError) throw secretError;
    return { success: true };
  });

export const syncPlatform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./tenant.server");
    const restaurant = await requireManager(context.supabase, context.userId);
    const { data: connection, error } = await context.supabase
      .from("platform_connections")
      .select("id, platform, restaurant_id")
      .eq("id", data.connectionId)
      .eq("restaurant_id", restaurant.id)
      .single();
    if (error) throw error;

    const { runPlatformSync } = await import("./platform-sync.server");
    const result = await runPlatformSync(context.supabase, connection);

    await context.supabase
      .from("platform_connections")
      .update({
        status: result.ok ? "connected" : "error",
        last_synced_at: result.ok ? new Date().toISOString() : null,
        last_error: result.ok ? null : result.message,
      })
      .eq("id", connection.id);

    return result;
  });
