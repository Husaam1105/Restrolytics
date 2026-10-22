import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Request access — Restrolytics" },
      { name: "description", content: "Restrolytics is currently invite-only. Sign in if you already have access." },
      { property: "og:title", content: "Request access — Restrolytics" },
      { property: "og:description", content: "Restrolytics is currently invite-only. Sign in if you already have access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Restrolytics is invite-only right now</CardTitle>
          <CardDescription>
            We're opening access gradually. If your restaurant has been invited, sign in with the
            account we created for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Want early access for your restaurant?{" "}
            <a href="mailto:hello@restrolytics.com" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
