"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { resetPassword } from "~/lib/auth-client";
import { AuthPane } from "~/components/auth-pane";
import { AuthError, AuthField, AuthSubmit } from "~/components/auth-form";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token. Request a new reset link.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const { error } = await resetPassword({ newPassword: password, token });

    setIsSubmitting(false);
    if (error) {
      setError(error.message ?? "Reset failed.");
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <AuthField
        label="New password"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        required
        autoComplete="new-password"
        placeholder="••••••••"
        minLength={6}
      />
      <AuthField
        label="Confirm password"
        name="confirm"
        type="password"
        value={confirm}
        onChange={setConfirm}
        required
        autoComplete="new-password"
        placeholder="••••••••"
      />
      <AuthError message={error} />
      <AuthSubmit isPending={isSubmitting} loadingText="Saving…">
        Set new password
      </AuthSubmit>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPane
      eyebrow="Recovery"
      title="New password."
      subtitle="Choose a new password for your account."
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthPane>
  );
}
