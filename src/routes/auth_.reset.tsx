import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthField, AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Landing page for both password-reset links and team invites. Supabase puts
 * the one-time session in the URL; once it's picked up, the user sets a password.
 */
export const Route = createFileRoute("/auth_/reset")({
  ssr: false,
  component: ResetPage,
  head: () => ({ meta: [{ title: "Set your password · Restrolytics" }, { name: "robots", content: "noindex" }] }),
});

function ResetPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let settled = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        settled = true;
        setStatus("ready");
      }
    });
    // If no session arrives from the link, it was used already or has expired.
    const timer = window.setTimeout(async () => {
      if (settled) return;
      const { data: current } = await supabase.auth.getSession();
      setStatus(current.session ? "ready" : "invalid");
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) return setError(updateError.message);
    toast.success("Password set. Welcome to Restrolytics.");
    navigate({ to: "/dashboard", replace: true });
  };

  if (status === "invalid") {
    return (
      <AuthShell
        title="This link has expired"
        description="Reset and invite links work once and expire after an hour. Ask for a new one."
        footer={
          <Link to="/auth" className="font-medium text-link underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <Button size="lg" className="w-full" asChild>
          <Link to="/auth/forgot">Send a new reset link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set your password" description="Choose a password you'll use to sign in from now on.">
      <form onSubmit={submit} className="space-y-4" noValidate aria-busy={status === "checking"}>
        <AuthField id="new-password" label="New password" hint="At least 8 characters.">
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            disabled={status !== "ready"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthField>
        <AuthField id="confirm-password" label="Type it again">
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            disabled={status !== "ready"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </AuthField>
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={status !== "ready" || saving}>
          {status === "checking" ? "Checking your link…" : saving ? "Saving…" : "Set password and continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
