"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AuthError,
  AuthField,
  AuthNotice,
  AuthSubmit,
} from "~/components/auth-form";
import { AuthPane } from "~/components/auth-pane";
import { useSupabase } from "~/components/providers/supabase-provider";

const NETWORK_ERROR =
  "Unable to reach the signup service. Check your connection and try again.";

export default function SignupPage() {
  const { supabase } = useSupabase();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearFeedback() {
    setError(null);
    setNotice(null);
  }

  function updateFullName(value: string) {
    setFullName(value);
    clearFeedback();
  }

  function updateEmail(value: string) {
    setEmail(value);
    clearFeedback();
  }

  function updatePassword(value: string) {
    setPassword(value);
    clearFeedback();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    clearFeedback();

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: trimmedName } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      if (!data.session) {
        setNotice(
          "Check your email to confirm your account, then return here to log in.",
        );
        setIsSubmitting(false);
        return;
      }

      window.location.assign("/onboarding/courses");
    } catch {
      setError(NETWORK_ERROR);
      setIsSubmitting(false);
    }
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
            className="font-medium text-[color:var(--color-phosphor)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[color:var(--color-phosphor)] focus-visible:outline-none"
          >
            Log in
          </Link>
          .
        </p>
      }
    >
      <form
        onSubmit={onSubmit}
        className="space-y-4"
        aria-busy={isSubmitting}
        aria-describedby={error ? "signup-error" : undefined}
      >
        <AuthField
          label="Full name"
          name="fullName"
          type="text"
          value={fullName}
          onChange={updateFullName}
          required
          disabled={isSubmitting}
          autoComplete="name"
          placeholder="Ada Lovelace"
        />
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
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          hint="min 6 chars"
        />
        <AuthError id="signup-error" message={error} />
        <AuthNotice message={notice} />
        <AuthSubmit isPending={isSubmitting} loadingText="Creating account…">
          Create account
        </AuthSubmit>
      </form>
    </AuthPane>
  );
}
