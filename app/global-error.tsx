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
    console.error("[global] route error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0a1a", color: "white", fontFamily: "system-ui" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
            Something broke at the very top level
          </h1>
          <p style={{ color: "#a1a1aa", maxWidth: 480, marginBottom: 20 }}>
            The error has been logged. Retry, or reload the page.
          </p>
          <button
            onClick={reset}
            style={{ padding: "10px 20px", background: "#4f46e5", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
