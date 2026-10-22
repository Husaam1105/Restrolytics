import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily vendor order sync. Called by the scheduled job; checks every vendor
 * with auto-sync enabled for new orders on their website.
 */
export const Route = createFileRoute("/api/public/hooks/vendor-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runVendorSync } = await import("@/lib/vendor-sync.server");

        const { data: vendors, error } = await supabaseAdmin
          .from("vendors")
          .select("id, restaurant_id, name, portal_type, login_url, orders_url, order_cadence_days")
          .eq("auto_sync", true)
          .eq("portal_type", "woocommerce");

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const results: { vendor: string; ok: boolean; message: string; newOrders: number }[] = [];

        for (const vendor of vendors ?? []) {
          try {
            const result = await runVendorSync(supabaseAdmin, vendor);
            await supabaseAdmin
              .from("vendors")
              .update({
                sync_status: result.ok ? "connected" : "error",
                ...(result.ok ? { last_synced_at: new Date().toISOString(), last_error: null } : { last_error: result.message }),
              })
              .eq("id", vendor.id);
            results.push({ vendor: vendor.name, ok: result.ok, message: result.message, newOrders: result.newOrders });
          } catch (syncError) {
            const message = syncError instanceof Error ? syncError.message : "Sync failed";
            await supabaseAdmin
              .from("vendors")
              .update({ sync_status: "error", last_error: message })
              .eq("id", vendor.id);
            results.push({ vendor: vendor.name, ok: false, message, newOrders: 0 });
          }
        }

        return new Response(JSON.stringify({ success: true, synced: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
