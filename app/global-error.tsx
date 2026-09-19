"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="wo">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#050507",
          color: "#f5f5f5",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 620 }}>
          <h1>BIA a rencontré une erreur.</h1>
          <button type="button" onClick={reset}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
