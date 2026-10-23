import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  email: z.string().trim().max(255).email().or(z.literal("")),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(300),
});

export const getMyDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("employees")
      .select("username, email, phone, address")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    return data;
  });

export const saveMyDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("employees")
      .update({
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
      })
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
