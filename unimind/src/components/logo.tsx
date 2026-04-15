type Props = { className?: string };

export function UnimindLogo({ className }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Unimind"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Central chip — octagon */}
      <path d="M14.5 13 H17.5 L19 14.5 V17.5 L17.5 19 H14.5 L13 17.5 V14.5 Z" strokeWidth="1.1" />
      {/* Chip core detail */}
      <rect x="15.25" y="15.25" width="1.5" height="1.5" strokeWidth="0.8" />

      {/* Circuit traces — each exits chip, bends at right angles, ends at a hollow node on the brain perimeter */}
      {/* Frontal lobes (top) — two peaks with a dip between them */}
      <path d="M15 13 V9 H13 V3.5" />
      <path d="M17 13 V9 H19 V3.5" />

      {/* Frontal shoulders */}
      <path d="M13 14.5 H10 V7 H8 V5.5" />
      <path d="M19 14.5 H22 V7 H24 V5.5" />

      {/* Temporal bulge — widest points */}
      <path d="M13 16 H8 V11 H4.5" />
      <path d="M19 16 H24 V11 H27.5" />

      {/* Lower temporal / parietal */}
      <path d="M13 17.5 H9 V18 H5.5" />
      <path d="M19 17.5 H23 V18 H26.5" />

      {/* Cerebellum curve — tapering inward */}
      <path d="M14.5 19 V22 H10.5 V23.5" />
      <path d="M17.5 19 V22 H21.5 V23.5" />

      {/* Brainstem — narrow bottom */}
      <path d="M15.5 19 V25 H14 V27.5" />
      <path d="M16.5 19 V25 H18 V27.5" />

      {/* Terminal nodes — hollow circles at brain silhouette points */}
      <g>
        {/* Frontal lobe peaks (highest, with dip at center x=16) */}
        <circle cx="13" cy="3.5" r="1.3" />
        <circle cx="19" cy="3.5" r="1.3" />
        {/* Frontal shoulders */}
        <circle cx="8" cy="5.5" r="1.3" />
        <circle cx="24" cy="5.5" r="1.3" />
        {/* Temporal bulge — widest */}
        <circle cx="4.5" cy="11" r="1.3" />
        <circle cx="27.5" cy="11" r="1.3" />
        {/* Lower sides */}
        <circle cx="5.5" cy="18" r="1.3" />
        <circle cx="26.5" cy="18" r="1.3" />
        {/* Cerebellum */}
        <circle cx="10.5" cy="23.5" r="1.3" />
        <circle cx="21.5" cy="23.5" r="1.3" />
        {/* Brainstem base — narrow */}
        <circle cx="14" cy="27.5" r="1.3" />
        <circle cx="18" cy="27.5" r="1.3" />
      </g>
    </svg>
  );
}
