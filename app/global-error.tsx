"use client";

import { useEffect } from "react";

// Fires only if the root layout itself throws — metadata/fonts/providers
// from app/layout.tsx aren't available here, so this stays plain and
// self-contained rather than trying to match the app's usual styling.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        path: window.location.pathname,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
          padding: 16,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#5a6472", marginTop: 4, fontSize: 14 }}>
            It&apos;s been logged. Try reloading the page.
          </p>
        </div>
        <button
          onClick={() => unstable_retry()}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #c7ccd1",
            background: "#003d82",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
