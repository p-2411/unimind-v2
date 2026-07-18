"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "~/lib/auth-client";
import { AuthPane } from "~/components/auth-pane";
import { AuthError, AuthField, AuthSubmit } from "~/components/auth-form";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error } = await signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Login failed.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthPane
      title="Welcome back."
      subtitle="Log in to pick up the streak where you left it."
      footer={
        <p>
          No account yet?{" "}
          <Link
            href="/signup"
            className="font-medium text-[color:var(--color-phosphor)] underline-offset-4 hover:underline"
          >
            Create one
          </Link>
          .
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          placeholder="you@university.edu"
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-mute)] transition-colors hover:text-[color:var(--color-phosphor)]"
          >
            Forgot password?
          </Link>
        </div>
        <AuthError message={error} />
        <AuthSubmit isPending={isSubmitting} loadingText="Logging in…">
          Log in
        </AuthSubmit>
      </form>
    </AuthPane>
  );
}
