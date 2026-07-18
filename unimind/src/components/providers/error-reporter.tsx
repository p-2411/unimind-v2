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
      const stack = event.error instanceof Error ? event.error.stack : undefined;
      report(event.message, stack, "window.onerror");
    }
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      if (event.reason instanceof Error) {
        report(event.reason.message, event.reason.stack, "unhandledrejection");
      } else {
        report("Unhandled rejection", undefined, "unhandledrejection");
      }
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
