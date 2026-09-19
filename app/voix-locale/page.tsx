"use client";

import { useEffect, useRef, useState } from "react";

export default function VoixLocale() {
  const [texte, setTexte] = useState(
    "Waaw, dégg naa la bu baax. Maa ngi fi pour dimbali la."
  );
  const [voice, setVoice] = useState<"slt" | "clb">("slt");
  const [etat, setEtat] = useState("Vérification du moteur local…");
  const [occupe, setOccupe] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  async function verifier() {
    try {
      const r = await fetch("/api/voix-locale", { cache: "no-store" });
      const d = await r.json();
      setEtat(
        r.ok && d.ok
          ? "Moteur wolof local prêt."
          : d.erreur || "Moteur local indisponible."
      );
    } catch {
      setEtat("Moteur local indisponible.");
    }
  }

  useEffect(() => {
    void verifier();
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  async function parler() {
    const propre = texte.trim();
    if (!propre || occupe) return;

    setOccupe(true);
    setEtat("Fabrication locale de la voix…");

    try {
      const debut = performance.now();
      const r = await fetch("/api/voix-locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texte: propre, voice }),
      });

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.erreur || "voix locale indisponible");
      }

      const blob = await r.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      audioRef.current.onended = () => setEtat("Lecture terminée.");

      const ms = performance.now() - debut;
      setEtat(`Audio local reçu en ${(ms / 1000).toFixed(2)} s — lecture…`);
      await audioRef.current.play();
    } catch (e) {
      setEtat(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#f5f5f5",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>Wolof Local TTS</h1>
        <p style={{ opacity: 0.75, marginTop: 0 }}>
          Test séparé de BIA : aucune API vocale distante.
        </p>

        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={8}
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontSize: 18,
            lineHeight: 1.5,
            padding: 16,
            borderRadius: 14,
            border: "1px solid #444",
            background: "#111",
            color: "#fff",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value as "slt" | "clb")}
            style={{ fontSize: 16, padding: "10px 12px" }}
          >
            <option value="slt">Voix SLT</option>
            <option value="clb">Voix CLB</option>
          </select>

          <button
            type="button"
            onClick={() => void parler()}
            disabled={occupe}
            style={{
              fontSize: 17,
              fontWeight: 700,
              padding: "11px 18px",
              borderRadius: 999,
              border: 0,
              cursor: occupe ? "wait" : "pointer",
            }}
          >
            {occupe ? "Fabrication…" : "▶ Lire en wolof"}
          </button>

          <button
            type="button"
            onClick={() => void verifier()}
            style={{
              fontSize: 15,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #555",
              background: "transparent",
              color: "#fff",
            }}
          >
            Vérifier le moteur
          </button>
        </div>

        <p style={{ marginTop: 20, opacity: 0.9 }}>{etat}</p>
      </div>
    </main>
  );
}
