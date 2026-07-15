"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: typeof window !== "undefined" ? window.location.href : "ssr",
        context: `global-error-boundary${error.digest ? ` (digest: ${error.digest})` : ""}`,
      }),
    });
  }, [error]);

  return (
    <html>
      <body
        style={{
          background: "#0d0f17",
          color: "#edf2fc",
          fontFamily: "'JetBrains Mono', monospace",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "1rem",
          margin: 0,
        }}
      >
        <div style={{ color: "#7cff6b", fontSize: "11px", letterSpacing: "0.24em", textTransform: "uppercase" }}>
          Mastify
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ color: "#6b7585", fontSize: "13px", margin: 0 }}>
          The error has been reported automatically.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "8px",
            background: "#7cff6b",
            color: "#0d0f17",
            border: "none",
            padding: "8px 24px",
            borderRadius: "8px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
