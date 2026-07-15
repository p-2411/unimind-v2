"use client";

import { useEffect } from "react";

function report(message: string, stack: string | undefined, context: string) {
  void fetch("/api/report-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stack, url: window.location.href, context }),
  });
}

export function ErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      report(event.message, event.error?.stack as string | undefined, "window.onerror");
    }
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason as { message?: string; stack?: string } | string | undefined;
      const message = typeof reason === "object" && reason !== null
        ? (reason.message ?? String(reason))
        : String(reason ?? "Unhandled promise rejection");
      const stack = typeof reason === "object" && reason !== null ? reason.stack : undefined;
      report(message, stack, "unhandledrejection");
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
