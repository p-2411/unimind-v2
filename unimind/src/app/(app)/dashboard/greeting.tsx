"use client";

import { useEffect, useState } from "react";

function pick(hour: number) {
  if (hour < 5) return { hi: "Burning the midnight oil", sub: "One more rep before bed?" };
  if (hour < 12) return { hi: "Good morning", sub: "Start the day with a quick rep." };
  if (hour < 17) return { hi: "Good afternoon", sub: "A question between classes?" };
  if (hour < 21) return { hi: "Good evening", sub: "Wind down with one more question." };
  return { hi: "Good evening", sub: "A late-night rep to cap the day." };
}

export function Greeting() {
  const [msg, setMsg] = useState(() => pick(12));
  useEffect(() => {
    setMsg(pick(new Date().getHours()));
  }, []);

  return (
    <>
      <h1 className="mt-2 font-mono text-[40px] font-semibold leading-[1] tracking-tight md:text-[52px]">
        {msg.hi}
        <span className="text-[color:var(--color-phosphor)]">.</span>
      </h1>
      <p className="mt-2 max-w-lg font-sans text-[14px] text-[color:var(--color-fg-soft)]">
        {msg.sub}
      </p>
    </>
  );
}
