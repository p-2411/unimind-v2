"use client";

import Link from "next/link";
import { useState } from "react";
import { useSupabase } from "~/components/providers/supabase-provider";
import { AuthPane } from "~/components/auth-pane";
import { AuthError, AuthField, AuthSubmit } from "~/components/auth-form";

export default function ForgotPasswordPage() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/confirm?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setIsSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthPane
        eyebrow="Recovery"
        title="Check your inbox."
        subtitle={`We sent a password reset link to ${email}. Click it to set a new password.`}
        footer={
          <p>
            Back to{" "}
            <Link
              href="/login"
              className="font-medium text-[color:var(--color-phosphor)] underline-offset-4 hover:underline"
            >
              log in
            </Link>
            .
          </p>
        }
      >
        <div className="border border-[color:var(--color-phosphor)]/30 bg-[color:var(--color-phosphor)]/5 px-4 py-3 font-mono text-[12px] text-[color:var(--color-phosphor)]">
          Email sent. Check your spam folder if it doesn't arrive within a minute.
        </div>
      </AuthPane>
    );
  }

  return (
    <AuthPane
      eyebrow="Recovery"
      title="Forgot password."
      subtitle="Enter your email and we'll send a reset link."
      footer={
        <p>
          Back to{" "}
          <Link
            href="/login"
            className="font-medium text-[color:var(--color-phosphor)] underline-offset-4 hover:underline"
          >
            log in
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
        <AuthError message={error} />
        <AuthSubmit isPending={isSubmitting} loadingText="Sending…">
          Send reset link
        </AuthSubmit>
      </form>
    </AuthPane>
  );
}
