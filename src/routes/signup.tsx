import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Get access · Restrolytics" },
      { name: "description", content: "Restrolytics is invite-only. Here's how to get in." },
    ],
  }),
});

function SignupPage() {
  return (
    <AuthShell
      title="Restrolytics is invite-only"
      description="We set up every restaurant with its owner, so your numbers are right from day one."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/auth" className="font-medium text-link underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ol className="space-y-4">
        <li className="surface p-4">
          <p className="font-semibold">Invited by your team?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the invite email and use its link to set your password. No email? Your manager can create a username login
            for you.
          </p>
        </li>
        <li className="surface p-4">
          <p className="font-semibold">Running a restaurant?</p>
          <p className="mt-1 text-sm text-muted-foreground">Book a 30-minute walkthrough and we'll set up your account with you.</p>
          <Button className="mt-3" asChild>
            <Link to="/contact">Book a walkthrough</Link>
          </Button>
        </li>
      </ol>
    </AuthShell>
  );
}
