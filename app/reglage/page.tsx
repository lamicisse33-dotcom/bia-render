"use client";

import { useEffect, useRef, useState } from "react";

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
  const [etat, setEtat] = useState("");
  const [duree, setDuree] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { try { setCode(localStorage.getItem("bia-code") || ""); } catch {} }, []);

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
        body: JSON.stringify({ texte, partie: 0, exaggeration: exag, temperature: temp, cfgWeight: cfg }),
      });
      const d = await r.json() as { audio?: string | null; type_mime?: string; erreur?: string };
      if (!d.audio) { setEtat(d.erreur || "Aucun son n'est revenu."); return; }
      setDuree(Date.now() - depart);
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
      {duree !== null ? <p className="etat">Fabriquée en {(duree / 1000).toFixed(1)} s.</p> : null}

      <p className="report">
        Quand ça te plaît, dans Render → Environment :<br />
        <code>SOYNADE_EXAGGERATION = {exag.toFixed(2)}</code><br />
        <code>SOYNADE_CFG_WEIGHT = {cfg.toFixed(2)}</code><br />
        <code>SOYNADE_TEMPERATURE = {temp.toFixed(2)}</code>
      </p>
    </main>
  );
}
