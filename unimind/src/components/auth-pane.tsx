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
    <main className="relative flex min-h-svh min-w-0 items-center justify-center px-5 py-8 sm:px-10 sm:py-10">
      <div className="w-full max-w-[440px] min-w-0">
        {/* Mobile header */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <UnimindLogo className="h-7 w-7 text-[color:var(--color-phosphor)]" />
          <div className="font-mono text-[16px] font-semibold tracking-tight">
            Unimind
          </div>
        </div>

        <div className="term-rise">
          <div className="font-mono text-[10px] tracking-[0.28em] text-[color:var(--color-fg-mute)] uppercase">
            {eyebrow}
          </div>
          <h1 className="mt-2 font-mono text-[34px] leading-[1.05] font-semibold tracking-tight break-words sm:text-[36px] md:text-[40px]">
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

        <div className="mt-10 flex justify-end font-mono text-[10px] tracking-[0.24em] text-[color:var(--color-fg-mute)] uppercase">
          <span className="inline-flex items-baseline gap-1.5">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[color:var(--color-phosphor)]"
            />
            ready
          </span>
        </div>
      </div>
    </main>
  );
}
