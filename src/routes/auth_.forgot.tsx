import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AuthField, AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth_/forgot")({
  component: ForgotPage,
  head: () => ({ meta: [{ title: "Reset your password · Restrolytics" }, { name: "robots", content: "noindex" }] }),
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      setError("Staff who sign in with a username can't reset by email. Ask your manager to set a new password for you.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    // Same message whether or not the account exists, so this can't be used to probe for emails.
    if (resetError && resetError.status === 429) {
      setError("Too many requests. Wait a minute and try again.");
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      title={sent ? "Check your email" : "Reset your password"}
      description={
        sent
          ? `If ${email.trim()} has a Restrolytics account, a reset link is on its way. It works once and expires in an hour.`
          : "Enter the email you sign in with and we'll send you a link."
      }
      footer={
        <Link to="/auth" className="font-medium text-link underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? null : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <AuthField id="email" label="Email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </AuthField>
          {error ? (
            <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={loading || !email.trim()}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
