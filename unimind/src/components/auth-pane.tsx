import Link from "next/link";
import { UnimindLogo } from "~/components/logo";

type Props = {
  eyebrow: string;
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
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <UnimindLogo className="h-7 w-7 text-[color:var(--color-phosphor)]" />
          <div className="font-mono text-[16px] font-semibold tracking-tight">
            Unimind
          </div>
        </div>

        <div className="term-rise">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">
            {eyebrow}
          </div>
          <h1 className="mt-2 font-mono text-[36px] font-semibold leading-[1.05] tracking-tight md:text-[40px]">
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
