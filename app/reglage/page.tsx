"use client";

import { useEffect, useRef, useState } from "react";
import { lireDurees, lireMesures, mediane, msDe } from "@/lib/chrono";
import type { Mesure } from "@/lib/chrono";
import { TRANSITIONS } from "@/lib/transitions";

/* Page d'écoute. Elle sert à choisir la voix de BIA à l'oreille plutôt qu'au
   jugé : on modifie les trois réglages de Soynade, on écoute, on compare.
   Une fois les bonnes valeurs trouvées, on les pose dans les variables
   d'environnement de Render et cette page n'a plus lieu d'être ouverte. */

const PHRASE_WO = "Salaam! Man maa di BIA. Naka nga def tey? Waxal ak man, dinaa la dimbali.";
const PHRASE_FR = "Bonjour, je suis BIA. Comment puis-je vous aider aujourd'hui ?";

const PRESETS = [
  { nom: "Très douce", exaggeration: 0.08, temperature: 0.30, cfgWeight: 0.22 },
  { nom: "Douce", exaggeration: 0.12, temperature: 0.35, cfgWeight: 0.28 },
  { nom: "Posée", exaggeration: 0.18, temperature: 0.40, cfgWeight: 0.35 },
  { nom: "Actuelle (Interprète)", exaggeration: 0.20, temperature: 0.10, cfgWeight: 0.50 },
];

export default function Reglage() {
  const [code, setCode] = useState("");
  const [texte, setTexte] = useState(PHRASE_WO);
  const [exag, setExag] = useState(0.12);
  const [temp, setTemp] = useState(0.35);
  const [cfg, setCfg] = useState(0.28);
  const [clonage, setClonage] = useState(true);
  const [etat, setEtat] = useState("");
  const [duree, setDuree] = useState<number | null>(null);
  const [moteur, setMoteur] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [durees, setDurees] = useState<Record<string, number>>({});

  useEffect(() => { try { setCode(localStorage.getItem("bia-code") || ""); } catch {} }, []);
  useEffect(() => { setMesures(lireMesures()); setDurees(lireDurees()); }, []);

  async function ecouter() {
    if (!code) { setEtat("Il faut ton code maître."); return; }
    audioRef.current?.pause();
    setEtat("Soynade fabrique la voix…");
    setDuree(null);
    const depart = Date.now();
    try {
      const r = await fetch("/api/voix", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": code },
        body: JSON.stringify({
          texte, partie: 0, exaggeration: exag, temperature: temp, cfgWeight: cfg,
          // Chaîne vide = on demande explicitement la voix d'origine, pour
          // pouvoir comparer les deux dans la même minute.
          audioPrompt: clonage ? undefined : "",
        }),
      });
      const d = await r.json() as { audio?: string | null; type_mime?: string; erreur?: string; moteur?: string };
      if (!d.audio) { setEtat(d.erreur || "Aucun son n'est revenu."); return; }
      setDuree(Date.now() - depart);
      setMoteur(d.moteur || "");
      const son = new Audio(`data:${d.type_mime || "audio/wav"};base64,${d.audio}`);
      audioRef.current = son;
      setEtat("");
      void son.play();
    } catch (e) {
      setEtat(String((e as Error).message));
    }
  }

  const curseur = (nom: string, valeur: number, poser: (v: number) => void, aide: string) => (
    <label className="curseur">
      <span className="curseur-titre">{nom}<b>{valeur.toFixed(2)}</b></span>
      <input type="range" min={0} max={1} step={0.01} value={valeur}
        onChange={(e) => poser(Number(e.target.value))} />
      <span className="curseur-aide">{aide}</span>
    </label>
  );

  return (
    <main className="reglage">
      <h1>La voix de BIA</h1>
      <p className="intro">
        Écoute, compare, puis reporte les trois valeurs dans Render.
        Chaque écoute consomme du crédit Soynade — la phrase est courte exprès.
      </p>

      <div className="rangee">
        <button className="secondaire" type="button" onClick={() => setTexte(PHRASE_WO)}>Phrase wolof</button>
        <button className="secondaire" type="button" onClick={() => setTexte(PHRASE_FR)}>Phrase française</button>
      </div>

      <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} aria-label="Phrase à lire" />

      <label className="bascule">
        <input type="checkbox" checked={clonage} onChange={(e) => setClonage(e.target.checked)} />
        <span>Utiliser <b>ta voix de référence</b> — décoche pour entendre la voix d'origine d'Oolel et comparer.</span>
      </label>

      <div className="rangee">
        {PRESETS.map((p) => (
          <button key={p.nom} className="secondaire" type="button"
            onClick={() => { setExag(p.exaggeration); setTemp(p.temperature); setCfg(p.cfgWeight); }}>
            {p.nom}
          </button>
        ))}
      </div>

      {curseur("Exagération", exag, setExag, "Bas = calme et retenue. Haut = emphase, insistance.")}
      {curseur("Poids CFG", cfg, setCfg, "Bas = débit lent et posé. Haut = débit rapide et net.")}
      {curseur("Température", temp, setTemp, "Bas = régulière, presque mécanique. Haut = vivante, variable.")}

      <button className="ecouter" type="button" onClick={() => void ecouter()}>Écouter</button>

      {etat ? <p className="etat">{etat}</p> : null}
      {duree !== null ? <p className="etat">Fabriquée en {(duree / 1000).toFixed(1)} s{moteur ? ` — ${moteur}` : ""}.</p> : null}

      {/* ── Le temps d'attente, tel qu'il a été mesuré sur cet appareil ────
          Ces chiffres servent à une chose : savoir quelles longueurs de
          phrases il manque. Si l'attente médiane après le micro est de douze
          secondes et que la plus longue phrase en fait huit, il en faut des
          plus longues — ou BIA devra en enchaîner deux. */}
      <h2 className="titre-mesures">Le temps d&apos;attente</h2>
      {mesures.length === 0 ? (
        <p className="intro">
          Rien de mesuré sur cet appareil. Pose quelques questions à BIA, puis
          reviens ici : les chiffres s&apos;écrivent tout seuls.
        </p>
      ) : (
        <p className="report">
          {(["parole", "ecrit"] as const).map((voie) => {
            const v = mesures.filter((m) => m.voie === voie);
            if (!v.length) return null;
            const s = (n: number) => (n / 1000).toFixed(1);
            return (
              <span key={voie}>
                <b>{voie === "parole" ? "Après le micro" : "Question tapée"}</b>
                {" "}— {v.length} échange{v.length > 1 ? "s" : ""}, médiane{" "}
                <b>{s(mediane(v.map((m) => m.total)))} s</b><br />
                transcription {s(mediane(v.map((m) => m.transcription)))} s ·{" "}
                modèle {s(mediane(v.map((m) => m.modele)))} s ·{" "}
                voix {s(mediane(v.map((m) => m.voix)))} s<br /><br />
              </span>
            );
          })}
          {(() => {
            const par = (d: string) => {
              const l = TRANSITIONS.filter((x) => x.duree === d).map((x) => msDe(x.wo, durees));
              return `${(Math.min(...l) / 1000).toFixed(1)} à ${(Math.max(...l) / 1000).toFixed(1)} s`;
            };
            const mesurees = TRANSITIONS.filter((x) => durees[x.wo] > 0).length;
            return (
              <span>
                <b>Les phrases de transition</b> — courtes {par("courte")} ·{" "}
                moyennes {par("moyenne")} · longues {par("longue")}<br />
                {mesurees} des {TRANSITIONS.length} ont déjà été dites, donc mesurées ;
                les autres sont estimées sur leur longueur.
              </span>
            );
          })()}
        </p>
      )}

      <p className="report">
        L'extrait de référence : <a href="/voix-bia.wav" target="_blank" rel="noreferrer">voix-bia.wav</a><br /><br />
        Quand ça te plaît, dans Render → Environment :<br />
        <code>SOYNADE_EXAGGERATION = {exag.toFixed(2)}</code><br />
        <code>SOYNADE_CFG_WEIGHT = {cfg.toFixed(2)}</code><br />
        <code>SOYNADE_TEMPERATURE = {temp.toFixed(2)}</code>
      </p>
    </main>
  );
}
