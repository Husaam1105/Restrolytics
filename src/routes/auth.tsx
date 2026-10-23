import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthField, AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in · Restrolytics" },
      { name: "description", content: "Sign in to your Restrolytics restaurant workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** Staff without email sign in with a username; it maps to <username>@kaizr.staff. */
function toLoginEmail(login: string) {
  const value = login.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@kaizr.staff`;
}

function AuthPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: toLoginEmail(login), password });
    setLoading(false);
    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("invalid")
          ? "That username or email and password don't match. Check for typos, or reset your password."
          : signInError.message,
      );
    }
    // On success the auth listener in __root refreshes the router and beforeLoad sends you to /dashboard.
  };

  const google = async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (oauthError) toast.error(oauthError.message);
  };

  return (
    <AuthShell
      title="Sign in"
      description="Use your email, or the username your manager gave you."
      footer={
        <>
          New restaurant? Restrolytics is invite-only.{" "}
          <Link to="/contact" className="font-medium text-link underline-offset-4 hover:underline">
            Book a walkthrough
          </Link>
          .
        </>
      }
    >
      <form onSubmit={signIn} className="space-y-4" noValidate>
        <AuthField id="login" label="Email or username">
          <Input
            id="login"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        </AuthField>
        <AuthField id="password" label="Password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthField>
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={loading || !login.trim() || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <div className="text-right">
          <Link to="/auth/forgot" className="text-sm font-medium text-link underline-offset-4 hover:underline">
            Forgot your password?
          </Link>
        </div>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" size="lg" className="w-full" onClick={google}>
        Continue with Google
      </Button>
    </AuthShell>
  );
}
