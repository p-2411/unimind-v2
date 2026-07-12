"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "~/lib/auth-client";
import { AuthPane } from "~/components/auth-pane";
import { AuthError, AuthField, AuthSubmit } from "~/components/auth-form";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await signUp.email({ email, password, name: trimmedName });

    if (error) {
      setError(error.message ?? "Signup failed.");
      setIsSubmitting(false);
      return;
    }

    router.push("/onboarding/courses");
    router.refresh();
  }

  return (
    <AuthPane
      eyebrow="New account"
      title="Start the streak."
      subtitle="Takes a minute. You can pick your courses right after."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[color:var(--color-phosphor)] underline-offset-4 hover:underline"
          >
            Log in
          </Link>
          .
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField
          label="Full name"
          name="fullName"
          type="text"
          value={fullName}
          onChange={setFullName}
          required
          autoComplete="name"
          placeholder="Ada Lovelace"
        />
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
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          hint="min 6 chars"
        />
        <AuthError message={error} />
        <AuthSubmit isPending={isSubmitting} loadingText="Creating account…">
          Create account
        </AuthSubmit>
      </form>
    </AuthPane>
  );
}
