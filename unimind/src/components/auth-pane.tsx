import Link from "next/link";
import { UnimindWordmark } from "~/components/logo";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthPane({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: Props) {
  return (
    <main className="relative flex min-h-svh items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[440px]">
        {/* Mobile header */}
        <div className="mb-8 lg:hidden">
          <UnimindWordmark className="h-7 w-auto text-[color:var(--color-phosphor)]" />
        </div>

        <div className="term-rise">
          {eyebrow && (
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">
              {eyebrow}
            </div>
          )}
          <h1 className="font-mono text-[36px] font-semibold leading-[1.05] tracking-tight md:text-[40px] [&:not(:first-child)]:mt-2">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-sm font-sans text-[14px] leading-relaxed text-[color:var(--color-fg-soft)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="term-rise mt-8" style={{ animationDelay: "80ms" }}>
          {children}
        </div>

        {footer && (
          <div
            className="term-rise mt-6 font-sans text-[13px] text-[color:var(--color-fg-soft)]"
            style={{ animationDelay: "160ms" }}
          >
            {footer}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
          <Link
            href="/"
            className="transition-colors hover:text-[color:var(--color-fg)]"
          >
            ← Back home
          </Link>
          <span className="inline-flex items-baseline gap-1.5">
            <span className="h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[color:var(--color-phosphor)]" />
            ready
          </span>
        </div>
      </div>
    </main>
  );
}
