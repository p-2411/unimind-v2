"use client";

import { useState } from "react";
import { useSupabase } from "~/components/providers/supabase-provider";
import { AuthPane } from "~/components/auth-pane";
import { AuthError, AuthField, AuthSubmit } from "~/components/auth-form";

export default function ResetPasswordPage() {
  const { supabase } = useSupabase();
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
    setIsSubmitting(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <AuthPane
      eyebrow="Recovery"
      title="New password."
      subtitle="Choose a new password for your account."
    >
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
    </AuthPane>
  );
}
