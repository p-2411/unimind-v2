// Scholar mark — icon only (mini logo)
export function UnimindLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-label="UniMind"
      className={className}
    >
      <path d="M 26,50 L 26,70 A 24,24 0 0 0 74,70 L 74,50" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M 10,50 L 90,50" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round"/>
      <path d="M 50,16 L 70,33 L 50,50 L 30,33 Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M 70,33 L 78,54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.82"/>
      <circle cx="78" cy="57" r="4" fill="currentColor"/>
    </svg>
  );
}

// Scholar mark + NIMIND — full wordmark
// viewBox 278×68: mark scaled (0.769) so U caps align with text caps at font-size 44
export function UnimindWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 278 68"
      fill="none"
      aria-label="UniMind"
      className={className}
    >
      <g transform="translate(0 -8.3) scale(0.769)">
        <path d="M 26,50 L 26,70 A 24,24 0 0 0 74,70 L 74,50" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M 10,50 L 90,50" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
        <path d="M 50,16 L 70,33 L 50,50 L 30,33 Z" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M 70,33 L 78,54" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.82"/>
        <circle cx="78" cy="57" r="3.5" fill="currentColor"/>
      </g>
      <text
        x="75" y="62"
        fontFamily="'Menlo','Monaco','Courier New',monospace"
        fontSize="44"
        fontWeight="700"
        letterSpacing="1"
        fill="currentColor"
      >NIMIND</text>
    </svg>
  );
}
