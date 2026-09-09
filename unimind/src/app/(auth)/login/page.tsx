"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthError, AuthField, AuthSubmit } from "~/components/auth-form";
import { AuthPane } from "~/components/auth-pane";
import { useSupabase } from "~/components/providers/supabase-provider";

const NETWORK_ERROR =
  "Unable to reach the login service. Check your connection and try again.";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateEmail(value: string) {
    setEmail(value);
    setError(null);
  }

  function updatePassword(value: string) {
    setPassword(value);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsSubmitting(false);
        return;
      }

      window.location.assign("/");
    } catch {
      setError(NETWORK_ERROR);
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPane
      eyebrow="Access"
      title="Welcome back."
      subtitle="Log in to pick up the streak where you left it."
      footer={
        <p>
          No account yet?{" "}
          <Link
            href="/signup"
            className="font-medium text-[color:var(--color-phosphor)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--color-phosphor)] focus-visible:outline-none"
          >
            Create one
          </Link>
          .
        </p>
      }
    >
      <form
        onSubmit={onSubmit}
        className="space-y-4"
        aria-busy={isSubmitting}
        aria-describedby={error ? "login-error" : undefined}
      >
        <AuthField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={updateEmail}
          required
          disabled={isSubmitting}
          autoComplete="email"
          placeholder="you@university.edu"
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={updatePassword}
          required
          disabled={isSubmitting}
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <AuthError id="login-error" message={error} />
        <AuthSubmit isPending={isSubmitting} loadingText="Logging in…">
          Log in
        </AuthSubmit>
      </form>
    </AuthPane>
  );
}
