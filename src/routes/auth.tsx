import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Restrolytics" },
      { name: "description", content: "Sign in to your Restrolytics restaurant workspace." },
      { property: "og:title", content: "Sign in — Restrolytics" },
      { property: "og:description", content: "Sign in to your Restrolytics restaurant workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const login = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: login.includes("@") ? login : `${login}@kaizr.staff`,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in successfully");
  };

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-premium)]">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Restrolytics</CardTitle>
          <CardDescription>Sign in to manage your restaurant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email or username</Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                placeholder="you@restaurant.com or first name"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Restrolytics is invite-only right now.{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Request access
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
