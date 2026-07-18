"use client";

export type RaccoonMood = "idle" | "happy" | "smug" | "tired" | "celebrating";

const C = {
  fur:     "#aeb4c4",
  furDk:   "#888ea0",
  face:    "#c8cdd8",
  mask:    "#171b26",
  white:   "#edf2fc",
  pupil:   "#06090e",
  ear:     "#cc9fa8",
  belly:   "#d9dde8",
  glow:    "#7cff6b",
} as const;

function Eyes({ mood }: { mood: RaccoonMood }) {
  const lx = 46, rx = 74, ey = 47;

  if (mood === "happy") {
    // closed crescent ^-^
    return (
      <>
        <path d={`M ${lx-8} ${ey+3} Q ${lx} ${ey-7} ${lx+8} ${ey+3}`} fill={C.pupil} />
        <path d={`M ${rx-8} ${ey+3} Q ${rx} ${ey-7} ${rx+8} ${ey+3}`} fill={C.pupil} />
      </>
    );
  }

  if (mood === "tired") {
    // half-closed, droopy lids
    return (
      <>
        <circle cx={lx} cy={ey} r={7} fill={C.white} />
        <circle cx={lx} cy={ey+2} r={4.5} fill={C.pupil} />
        <circle cx={lx+2} cy={ey} r={1.5} fill={C.white} />
        <path d={`M ${lx-8} ${ey-0.5} Q ${lx} ${ey-6} ${lx+8} ${ey-0.5}`} fill={C.mask} />
        <circle cx={rx} cy={ey} r={7} fill={C.white} />
        <circle cx={rx} cy={ey+2} r={4.5} fill={C.pupil} />
        <circle cx={rx+2} cy={ey} r={1.5} fill={C.white} />
        <path d={`M ${rx-8} ${ey-0.5} Q ${rx} ${ey-6} ${rx+8} ${ey-0.5}`} fill={C.mask} />
      </>
    );
  }

  if (mood === "smug") {
    // left: normal, right: narrowed
    return (
      <>
        <circle cx={lx} cy={ey} r={7} fill={C.white} />
        <circle cx={lx+1} cy={ey+1} r={4} fill={C.pupil} />
        <circle cx={lx+3} cy={ey-1} r={1.5} fill={C.white} />
        <circle cx={rx} cy={ey+1} r={6} fill={C.white} />
        <circle cx={rx+1} cy={ey+2} r={3.5} fill={C.pupil} />
        <path d={`M ${rx-7} ${ey-3} Q ${rx} ${ey-9} ${rx+7} ${ey-3}`} fill={C.mask} />
      </>
    );
  }

  if (mood === "celebrating") {
    // wide, sparkling
    return (
      <>
        <circle cx={lx} cy={ey} r={8} fill={C.white} />
        <circle cx={lx+1} cy={ey+1} r={5} fill={C.pupil} />
        <circle cx={lx+3} cy={ey-2} r={2} fill={C.white} />
        <circle cx={rx} cy={ey} r={8} fill={C.white} />
        <circle cx={rx+1} cy={ey+1} r={5} fill={C.pupil} />
        <circle cx={rx+3} cy={ey-2} r={2} fill={C.white} />
      </>
    );
  }

  // idle
  return (
    <>
      <circle cx={lx} cy={ey} r={7} fill={C.white} />
      <circle cx={lx+1} cy={ey+1} r={4} fill={C.pupil} />
      <circle cx={lx+3} cy={ey-1} r={1.5} fill={C.white} />
      <circle cx={rx} cy={ey} r={7} fill={C.white} />
      <circle cx={rx+1} cy={ey+1} r={4} fill={C.pupil} />
      <circle cx={rx+3} cy={ey-1} r={1.5} fill={C.white} />
    </>
  );
}

function Mouth({ mood }: { mood: RaccoonMood }) {
  const mx = 60, my = 61;
  switch (mood) {
    case "happy":
      return <path d={`M ${mx-9} ${my} Q ${mx} ${my+10} ${mx+9} ${my}`} stroke={C.pupil} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
    case "celebrating":
      return (
        <g>
          <path d={`M ${mx-10} ${my-1} Q ${mx} ${my+11} ${mx+10} ${my-1}`} fill={C.pupil} />
          <rect x={mx-5} y={my+2} width={4} height={5} rx={1} fill={C.white} />
          <rect x={mx+1} y={my+2} width={4} height={5} rx={1} fill={C.white} />
        </g>
      );
    case "tired":
      return <path d={`M ${mx-7} ${my+4} Q ${mx} ${my+2} ${mx+7} ${my+4}`} stroke={C.pupil} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    case "smug":
      return <path d={`M ${mx-7} ${my+4} Q ${mx+1} ${my+5} ${mx+8} ${my+1}`} stroke={C.pupil} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    default:
      return <path d={`M ${mx-7} ${my} Q ${mx} ${my+8} ${mx+7} ${my}`} stroke={C.pupil} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
  }
}

export function Raccoon({
  mood = "idle",
  size = 80,
  className,
}: {
  mood?: RaccoonMood;
  size?: number;
  className?: string;
}) {
  const lift = mood === "celebrating" ? -5 : 0;
  const up = mood === "happy" || mood === "celebrating";
  const tired = mood === "tired";
  const smug = mood === "smug";

  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={Math.round((size * 130) / 120)}
      aria-hidden
      className={className}
    >
      {/* TAIL */}
      <path
        d="M 79 107 Q 104 97 107 79 Q 112 59 99 55 Q 88 51 83 66 Q 79 80 87 92 Q 92 101 83 108"
        fill={C.fur}
      />
      <path d="M 100 57 Q 109 65 108 79" stroke={C.furDk} strokeWidth="6" fill="none" opacity="0.35" />
      <path d="M 91 53 Q 97 54 100 57" stroke={C.furDk} strokeWidth="6" fill="none" opacity="0.35" />
      <path d="M 83 67 Q 81 74 84 82" stroke={C.furDk} strokeWidth="5" fill="none" opacity="0.25" />

      {/* BODY */}
      <ellipse cx="60" cy={101 + lift} rx="22" ry="19" fill={C.fur} />
      <ellipse cx="60" cy={104 + lift} rx="13" ry="14" fill={C.belly} />

      {/* ARMS */}
      {up ? (
        <>
          <path d={`M 42 ${94+lift} Q 27 ${81+lift} 21 ${69+lift}`} stroke={C.fur} strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d={`M 78 ${94+lift} Q 93 ${81+lift} 99 ${69+lift}`} stroke={C.fur} strokeWidth="11" fill="none" strokeLinecap="round" />
          <circle cx="19" cy={66+lift} r="8" fill={C.fur} />
          <circle cx="101" cy={66+lift} r="8" fill={C.fur} />
        </>
      ) : tired ? (
        <>
          <path d="M 42 99 Q 34 108 30 116" stroke={C.fur} strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 78 99 Q 86 108 90 116" stroke={C.fur} strokeWidth="10" fill="none" strokeLinecap="round" />
          <ellipse cx="28" cy="118" rx="8" ry="5" fill={C.fur} />
          <ellipse cx="92" cy="118" rx="8" ry="5" fill={C.fur} />
        </>
      ) : smug ? (
        <>
          <path d="M 42 97 Q 33 100 28 106" stroke={C.fur} strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 78 95 Q 89 88 94 79" stroke={C.fur} strokeWidth="10" fill="none" strokeLinecap="round" />
          <ellipse cx="26" cy="109" rx="8" ry="5" fill={C.fur} />
          <ellipse cx="96" cy="77" rx="7" ry="6" fill={C.fur} />
        </>
      ) : (
        <>
          <path d="M 42 98 Q 38 108 38 116" stroke={C.fur} strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 78 98 Q 82 108 82 116" stroke={C.fur} strokeWidth="10" fill="none" strokeLinecap="round" />
          <ellipse cx="38" cy="118" rx="9" ry="5" fill={C.fur} />
          <ellipse cx="82" cy="118" rx="9" ry="5" fill={C.fur} />
        </>
      )}

      {/* HEAD */}
      <circle cx="60" cy="46" r="32" fill={C.fur} />

      {/* EARS */}
      <ellipse cx="33" cy="17" rx="13" ry="16" fill={C.fur} />
      <ellipse cx="87" cy="17" rx="13" ry="16" fill={C.fur} />
      <ellipse cx="33" cy="19" rx="7.5" ry="10" fill={C.ear} />
      <ellipse cx="87" cy="19" rx="7.5" ry="10" fill={C.ear} />

      {/* FACE */}
      <circle cx="60" cy="50" r="23" fill={C.face} />

      {/* MASK */}
      <ellipse cx="46" cy="47" rx="12" ry="10" fill={C.mask} />
      <ellipse cx="74" cy="47" rx="12" ry="10" fill={C.mask} />

      {/* EYES */}
      <Eyes mood={mood} />

      {/* NOSE */}
      <ellipse cx="60" cy="59" rx="5" ry="3.5" fill={C.mask} />
      <ellipse cx="59" cy="58" rx="2" ry="1.5" fill={C.furDk} opacity="0.35" />

      {/* MOUTH */}
      <Mouth mood={mood} />

      {/* FOREHEAD STRIPE */}
      <rect x="57" y="17" width="6" height="14" rx="3" fill={C.furDk} opacity="0.28" />

      {/* MOOD EXTRAS */}
      {tired && (
        <g>
          <text x="94" y="36" fontFamily="monospace" fontSize="10" fill={C.glow} opacity="0.45">z</text>
          <text x="103" y="25" fontFamily="monospace" fontSize="12" fill={C.glow} opacity="0.65">z</text>
          <text x="113" y="14" fontFamily="monospace" fontSize="14" fill={C.glow} opacity="0.85">Z</text>
        </g>
      )}
      {mood === "celebrating" && (
        <g fill={C.glow}>
          <circle cx="12" cy="38" r="3" />
          <circle cx="108" cy="32" r="2.5" />
          <circle cx="8" cy="64" r="2" />
          <circle cx="112" cy="60" r="2" />
          <path d="M 16 20 L 18 12 L 20 20 L 28 22 L 20 24 L 18 32 L 16 24 L 8 22 Z" opacity="0.9" />
          <path d="M 100 16 L 102 9 L 104 16 L 111 18 L 104 20 L 102 27 L 100 20 L 93 18 Z" opacity="0.85" />
          <path d="M 106 46 L 107.5 40 L 109 46 L 115 48 L 109 50 L 107.5 56 L 106 50 L 100 48 Z" opacity="0.7" />
        </g>
      )}
      {smug && (
        <g fill={C.glow} opacity="0.75">
          <circle cx="104" cy="36" r="2.5" />
          <circle cx="110" cy="28" r="1.5" />
          <circle cx="108" cy="20" r="1" />
        </g>
      )}
    </svg>
  );
}
