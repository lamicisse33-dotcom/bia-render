"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#050507",
        color: "#f5f5f5",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 620 }}>
        <h1>BIA a rencontré une erreur.</h1>
        <p>La page peut être relancée sans effacer la conversation.</p>
        <button type="button" onClick={reset}>
          Réessayer
        </button>
      </div>
    </main>
  );
}
