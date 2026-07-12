function RaccoonIcon() {
  return (
    <>
      {/* Graduation cap */}
      <rect x="11" y="12" width="78" height="14" rx="2" fill="currentColor" />
      <rect x="35" y="26" width="30" height="11" rx="2" fill="currentColor" opacity="0.82" />
      <line x1="88" y1="19" x2="94" y2="33" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="94" cy="36" r="3" fill="currentColor" />

      {/* Ears */}
      <circle cx="26" cy="43" r="10" stroke="currentColor" strokeWidth="4" />
      <circle cx="74" cy="43" r="10" stroke="currentColor" strokeWidth="4" />

      {/* Head — slim ellipse */}
      <ellipse cx="50" cy="69" rx="23" ry="28" stroke="currentColor" strokeWidth="4" />

      {/* Eye mask */}
      <ellipse cx="37" cy="66" rx="9.5" ry="7" fill="currentColor" opacity="0.18" />
      <ellipse cx="63" cy="66" rx="9.5" ry="7" fill="currentColor" opacity="0.18" />

      {/* Eyes */}
      <circle cx="37" cy="66" r="4" fill="currentColor" />
      <circle cx="63" cy="66" r="4" fill="currentColor" />

      {/* Nose */}
      <circle cx="50" cy="77" r="2.5" fill="currentColor" opacity="0.58" />
    </>
  );
}

export function MastifyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-label="Mastify" className={className}>
      <RaccoonIcon />
    </svg>
  );
}

export function MastifyWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 310 100" fill="none" aria-label="Mastify" className={className}>
      <RaccoonIcon />
      <text
        x="108" y="72"
        fontFamily="'Menlo','Monaco','Courier New',monospace"
        fontSize="44"
        fontWeight="700"
        letterSpacing="1"
        fill="currentColor"
      >MASTIFY</text>
    </svg>
  );
}
