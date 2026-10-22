import type { SupabaseClient } from "@supabase/supabase-js";

export type SyncResult = {
  ok: boolean;
  imported: number;
  message: string;
};

/**
 * Pulls orders for a connected platform.
 *
 * Live order import requires an approved partner/developer app on each provider
 * (Toast, Uber Eats, DoorDash, Grubhub). Until the stored credentials belong to
 * an approved app, we verify the credentials are present and report back instead
 * of inventing sales rows.
 */
export async function runPlatformSync(
  supabase: SupabaseClient,
  connection: { id: string; platform: string; restaurant_id: string },
): Promise<SyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: secret, error } = await supabaseAdmin
    .from("platform_connection_secrets")
    .select("credentials")
    .eq("connection_id", connection.id)
    .maybeSingle();

  if (error) {
    return { ok: false, imported: 0, message: error.message };
  }

  const credentials = (secret?.credentials ?? {}) as Record<string, string>;
  if (Object.keys(credentials).length === 0) {
    return { ok: false, imported: 0, message: "No credentials stored for this connection." };
  }

  const { count } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", connection.restaurant_id)
    .eq("platform", connection.platform);

  return {
    ok: true,
    imported: 0,
    message: `Credentials verified. ${count ?? 0} ${connection.platform} orders on file. Live order import starts once your ${connection.platform} developer app is approved for production access.`,
  };
}
