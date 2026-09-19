"use client";

export default function VoixLocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#050505",
        color: "#f5f5f5",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div>
        <h1>Erreur du test Wolof Local</h1>
        <p>Le moteur principal BIA n’est pas modifié.</p>
        <button type="button" onClick={reset}>
          Réessayer
        </button>
      </div>
    </main>
  );
}
