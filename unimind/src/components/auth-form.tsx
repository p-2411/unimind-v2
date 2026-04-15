"use client";

import { AlertCircle, ArrowRight } from "lucide-react";

type FieldProps = {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  hint?: string;
};

export function AuthField({
  label,
  name,
  type,
  value,
  onChange,
  required,
  placeholder,
  autoComplete,
  minLength,
  hint,
}: FieldProps) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
          {label}
        </span>
        {hint && (
          <span className="font-mono text-[10px] text-[color:var(--color-fg-mute)]">
            {hint}
          </span>
        )}
      </div>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        className="mt-1.5 block w-full border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-3 py-2.5 font-sans text-[14px] text-[color:var(--color-fg)] outline-none transition-colors placeholder:text-[color:var(--color-fg-mute)]/70 focus:border-[color:var(--color-phosphor)]"
      />
    </label>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 border border-[color:var(--color-red)]/40 bg-[color:var(--color-red)]/10 px-3 py-2.5"
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-red)]"
        strokeWidth={2}
      />
      <span className="font-sans text-[12.5px] leading-snug text-[color:var(--color-fg)]">
        {message}
      </span>
    </div>
  );
}

export function AuthSubmit({
  children,
  loadingText,
  isPending,
}: {
  children: React.ReactNode;
  loadingText: string;
  isPending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="group inline-flex w-full items-center justify-center gap-2 border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.22em] text-[color:var(--color-void)] transition-colors hover:bg-[color:var(--color-phosphor)]/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? loadingText : children}
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
        strokeWidth={2.4}
      />
    </button>
  );
}
