"use client";

import { useEffect, useRef, useState } from "react";

type Voix = "slt" | "clb";

export default function VoixLocale() {
  const [texte, setTexte] = useState(
    "Waaw, dégg naa la bu baax. Maa ngi fi pour dimbali la."
  );
  const [voice, setVoice] = useState<Voix>("slt");
  const [etat, setEtat] = useState("Vérification du moteur local…");
  const [occupe, setOccupe] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  function changerVoix(value: string) {
    setVoice(value === "clb" ? "clb" : "slt");
  }

  async function verifier() {
    try {
      const r = await fetch("/api/voix-locale", { cache: "no-store" });
      const d = await r.json();

      setEtat(
        r.ok && d.ok
          ? "✅ Moteur wolof local prêt"
          : `❌ ${d.erreur || "Moteur local indisponible"}`
      );
    } catch {
      setEtat("❌ Moteur wolof local indisponible");
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
        throw new Error(d.erreur || "Voix locale indisponible");
      }

      const blob = await r.blob();

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);

      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      if (!audioRef.current) audioRef.current = new Audio();

      audioRef.current.src = url;
      audioRef.current.onended = () => setEtat("✅ Lecture terminée");

      const secondes = ((performance.now() - debut) / 1000).toFixed(2);
      setEtat(`✅ Voix wolof reçue en ${secondes} s — lecture…`);

      await audioRef.current.play();
    } catch (e) {
      setEtat(
        `❌ ${e instanceof Error ? e.message : "Erreur inconnue"}`
      );
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
        padding: 30,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1>DYDY — Wolof Local</h1>
        <p>{etat}</p>

        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={10}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 16,
            fontSize: 20,
            lineHeight: 1.5,
            background: "#111",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 14,
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 15,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          <select
            value={voice}
            onChange={(e) => changerVoix(e.target.value)}
            style={{ fontSize: 18, padding: 10 }}
          >
            <option value="slt">Voix SLT</option>
            <option value="clb">Voix CLB</option>
          </select>

          <button
            type="button"
            onClick={() => void parler()}
            disabled={occupe}
            style={{
              fontSize: 19,
              padding: "12px 22px",
              cursor: occupe ? "wait" : "pointer",
            }}
          >
            {occupe ? "Fabrication…" : "▶ Lire en wolof"}
          </button>

          <button
            type="button"
            onClick={() => void verifier()}
            style={{ fontSize: 16, padding: "10px 16px" }}
          >
            Vérifier le moteur
          </button>
        </div>
      </div>
    </main>
  );
}
