"use client";

import { useEffect, useState } from "react";

export function AnimatedBar({
  pct,
  color,
  delay = 0,
  rounded = false,
}: {
  pct: number;
  color: string;
  delay?: number;
  rounded?: boolean;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 60 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div
      className={rounded ? "h-full rounded-full" : "h-full"}
      style={{
        width: `${width}%`,
        background: color,
        transition: "width 0.85s cubic-bezier(0.2, 0.7, 0.2, 1)",
      }}
    />
  );
}
