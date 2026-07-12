function RaccoonIcon() {
  return (
    <>
      {/* Ears — drawn first so cap band sits on top */}
      <circle cx="24" cy="46" r="12" stroke="currentColor" strokeWidth="4.5" />
      <circle cx="76" cy="46" r="12" stroke="currentColor" strokeWidth="4.5" />
      <circle cx="24" cy="46" r="6"  stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
      <circle cx="76" cy="46" r="6"  stroke="currentColor" strokeWidth="2.5" opacity="0.5" />

      {/* Graduation cap */}
      <rect x="34" y="30" width="32" height="12" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="10" y="14" width="80" height="18" rx="3" fill="currentColor" />
      <circle cx="50" cy="14" r="3.5" fill="currentColor" opacity="0.55" />
      <line x1="88" y1="23" x2="95" y2="39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="95" cy="43" r="3.5" fill="currentColor" />

      {/* Head */}
      <circle cx="50" cy="68" r="27" stroke="currentColor" strokeWidth="5" />

      {/* Eye mask patches */}
      <ellipse cx="37" cy="66" rx="11.5" ry="8" fill="currentColor" opacity="0.22" />
      <ellipse cx="63" cy="66" rx="11.5" ry="8" fill="currentColor" opacity="0.22" />

      {/* Eyes */}
      <circle cx="37" cy="66" r="7"   stroke="currentColor" strokeWidth="3" />
      <circle cx="63" cy="66" r="7"   stroke="currentColor" strokeWidth="3" />
      <circle cx="37" cy="66" r="3.5" fill="currentColor" />
      <circle cx="63" cy="66" r="3.5" fill="currentColor" />
      <circle cx="39" cy="64" r="1.5" fill="white" />
      <circle cx="65" cy="64" r="1.5" fill="white" />

      {/* Nose + mouth */}
      <ellipse cx="50" cy="77" rx="4" ry="3" fill="currentColor" opacity="0.75" />
      <path d="M 45 81 Q 50 87 55 81" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
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
