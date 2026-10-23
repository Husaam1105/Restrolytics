import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Constant-time check of `Authorization: Bearer <VENDOR_SYNC_SECRET>`. */
function isAuthorized(request: Request) {
  const secret = process.env["VENDOR_SYNC_SECRET"];
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily vendor order sync. Called by the scheduled job with a server-only
 * secret; checks every vendor with auto-sync enabled for new orders.
 * Returns only aggregate counts so no tenant data leaves the server.
 */
export const Route = createFileRoute("/api/public/hooks/vendor-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runVendorSync } = await import("@/lib/vendor-sync.server");

        const { data: vendors, error } = await supabaseAdmin
          .from("vendors")
          .select("id, restaurant_id, name, portal_type, login_url, orders_url, order_cadence_days")
          .eq("auto_sync", true)
          .eq("portal_type", "woocommerce");

        if (error) {
          console.error("vendor-sync: failed to list vendors", error);
          return json({ error: "Sync failed" }, 500);
        }

        let succeeded = 0;
        let failed = 0;
        let newOrders = 0;

        for (const vendor of vendors ?? []) {
          try {
            const result = await runVendorSync(supabaseAdmin, vendor);
            await supabaseAdmin
              .from("vendors")
              .update({
                sync_status: result.ok ? "connected" : "error",
                ...(result.ok
                  ? { last_synced_at: new Date().toISOString(), last_error: null }
                  : { last_error: result.message }),
              })
              .eq("id", vendor.id);
            if (result.ok) succeeded += 1;
            else failed += 1;
            newOrders += result.newOrders;
          } catch (syncError) {
            const message = syncError instanceof Error ? syncError.message : "Sync failed";
            await supabaseAdmin
              .from("vendors")
              .update({ sync_status: "error", last_error: message })
              .eq("id", vendor.id);
            failed += 1;
          }
        }

        return json({ success: true, vendors: succeeded + failed, succeeded, failed, newOrders });
      },
    },
  },
});
