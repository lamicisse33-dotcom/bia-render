"use client";

import { useEffect, useRef, useState } from "react";
import { lireMesures, mediane } from "@/lib/chrono";
import { CLE_VITESSE, VITESSE_POSEE, ralentir, vitesseChoisie } from "@/lib/ralentir";
import type { Mesure } from "@/lib/chrono";

/* Page d'écoute. Elle sert à choisir la voix de BIA à l'oreille plutôt qu'au
   jugé : on modifie les trois réglages de Soynade, on écoute, on compare.
   Une fois les bonnes valeurs trouvées, on les pose dans les variables
   d'environnement de Render et cette page n'a plus lieu d'être ouverte. */

const PHRASE_WO = "Salaam! Man maa di BIA. Naka nga def tey? Waxal ak man, dinaa la dimbali.";
const PHRASE_FR = "Bonjour, je suis BIA. Comment puis-je vous aider aujourd'hui ?";

const PRESETS = [
  { nom: "Très reposée", exaggeration: 0.08, temperature: 0.30, cfgWeight: 0.18 },
  { nom: "Reposée", exaggeration: 0.10, temperature: 0.35, cfgWeight: 0.22 },
  { nom: "Douce", exaggeration: 0.12, temperature: 0.35, cfgWeight: 0.28 },
  { nom: "Actuelle (Interprète)", exaggeration: 0.20, temperature: 0.10, cfgWeight: 0.50 },
];

export default function Reglage() {
  const [code, setCode] = useState("");
  const [texte, setTexte] = useState(PHRASE_WO);
  const [exag, setExag] = useState(0.12);
  const [temp, setTemp] = useState(0.35);
  const [cfg, setCfg] = useState(0.22);
  /* LE DÉBIT, CELUI QUI MARCHE VRAIMENT. Il n'est pas envoyé à Soynade : le
     modèle de voix n'a aucun réglage de vitesse (vérifié dans sa
     documentation). C'est le téléphone qui étire le son, sans toucher à la
     hauteur. Gardé sur l'appareil, donc il prend effet tout de suite, sans
     redéploiement — et sans consommer un signe de crédit. */
  const [debit, setDebit] = useState(VITESSE_POSEE);
  const [clonage, setClonage] = useState(true);
  const [etat, setEtat] = useState("");
  const [duree, setDuree] = useState<number | null>(null);
  const [moteur, setMoteur] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [tenue, setTenue] = useState("nouvelle");
  const [tenueEtat, setTenueEtat] = useState("");

  useEffect(() => { try { setCode(localStorage.getItem("bia-code") || ""); } catch {} }, []);
  useEffect(() => { setDebit(vitesseChoisie()); }, []);
  // On l'écrit à chaque mouvement du curseur : BIA le lira au prochain mot.
  useEffect(() => {
    try { localStorage.setItem(CLE_VITESSE, String(debit)); } catch {}
  }, [debit]);
  useEffect(() => { setMesures(lireMesures()); }, []);
  useEffect(() => {
    fetch("/api/etat").then((r) => r.json()).then((e) => { if (e?.tenue) setTenue(String(e.tenue)); }).catch(() => {});
  }, []);

  async function changerTenue(valeur: string) {
    if (!code) { setTenueEtat("Il faut ton code maître."); return; }
    setTenueEtat("…");
    try {
      const r = await fetch("/api/tenue", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": code },
        body: JSON.stringify({ valeur }),
      });
      if (!r.ok) { setTenueEtat(`Erreur ${r.status}`); return; }
      setTenue(valeur);
      setTenueEtat("Tenue changée pour tout le monde.");
    } catch { setTenueEtat("Impossible de joindre le serveur."); }
  }

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
          texte, partie: 0, ou: "réglage", exaggeration: exag, temperature: temp, cfgWeight: cfg,
          // Chaîne vide = on demande explicitement la voix d'origine, pour
          // pouvoir comparer les deux dans la même minute.
          audioPrompt: clonage ? undefined : "",
        }),
      });
      const d = await r.json() as { audio?: string | null; type_mime?: string; erreur?: string; moteur?: string };
      if (!d.audio) { setEtat(d.erreur || "Aucun son n'est revenu."); return; }
      setDuree(Date.now() - depart);
      setMoteur(d.moteur || "");
      /* ON ÉCOUTE CE QUE BIA DIRA, PAS AUTRE CHOSE. Le son est ralenti ici
         exactement comme il le sera dans la conversation : un essai qui ne
         passerait pas par le même chemin ne servirait à rien. */
      const octets = Uint8Array.from(atob(d.audio), (c) => c.charCodeAt(0)).buffer;
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioCtxRef.current || (audioCtxRef.current = new C());
      if (ctx.state === "suspended") await ctx.resume();
      const brut = await ctx.decodeAudioData(octets.slice(0));
      const pose = ralentir(ctx, brut, debit);
      sourceRef.current?.stop();
      const source = ctx.createBufferSource();
      source.buffer = pose;
      source.connect(ctx.destination);
      sourceRef.current = source;
      source.start();
      setEtat("");
    } catch (e) {
      setEtat(String((e as Error).message));
    }
  }

  const curseur = (nom: string, valeur: number, poser: (v: number) => void, aide: string,
                   bornes: [number, number] = [0, 1]) => (
    <label className="curseur">
      <span className="curseur-titre">{nom}<b>{valeur.toFixed(2)}</b></span>
      <input type="range" min={bornes[0]} max={bornes[1]} step={0.01} value={valeur}
        onChange={(e) => poser(Number(e.target.value))} />
      <span className="curseur-aide">{aide}</span>
    </label>
  );

  return (
    <main className="reglage">
      <h1>La voix de BIA</h1>

      <section style={{ margin: "0 0 28px" }}>
        <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>La tenue de BIA</h2>
        <div className="rangee">
          <button
            className="secondaire"
            type="button"
            disabled={tenue === "classique"}
            onClick={() => void changerTenue("classique")}
            style={tenue === "classique" ? { fontWeight: 700, opacity: 1 } : undefined}
          >
            Classique{tenue === "classique" ? " ✓" : ""}
          </button>
          <button
            className="secondaire"
            type="button"
            disabled={tenue === "wax"}
            onClick={() => void changerTenue("wax")}
            style={tenue === "wax" ? { fontWeight: 700, opacity: 1 } : undefined}
          >
            Wax{tenue === "wax" ? " ✓" : ""}
          </button>
          <button
            className="secondaire"
            type="button"
            disabled={tenue === "nouvelle"}
            onClick={() => void changerTenue("nouvelle")}
            style={tenue === "nouvelle" ? { fontWeight: 700, opacity: 1 } : undefined}
          >
            Nouvelle{tenue === "nouvelle" ? " ✓" : ""}
          </button>
        </div>
        {tenueEtat ? <p className="etat">{tenueEtat}</p> : null}
      </section>

      <p className="intro">
        Écoute, compare, puis reporte dans Render les trois premières valeurs.
        Le <b>débit</b>, lui, se garde sur ce téléphone et agit immédiatement.
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
      {curseur("Débit", debit, setDebit,
        "0,70 = un tiers plus lent, et c'est le réglage actuel. Sa hauteur de voix ne change pas : c'est toujours la voix de Kha, elle prend seulement son temps. Celui-ci agit TOUT DE SUITE et seulement sur ce téléphone — rien à reporter dans Render. Quand tu as trouvé le bon chiffre, dis-le-moi et j'en fais la valeur de tout le monde.",
        [0.6, 1])}

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
          {/* Le tableau des cinquante-six phrases a disparu avec elles : BIA
              n'a plus qu'une seule voix d'attente, dans lib/attente.ts. */}
        </p>
      )}

      <p className="report">
        L'extrait de référence : <a href="/voix-bia.wav" target="_blank" rel="noreferrer">voix-bia.wav</a><br /><br />
        Quand ça te plaît, dans Render → Environment :<br />
        <code>SOYNADE_EXAGGERATION = {exag.toFixed(2)}</code><br />
        <code>SOYNADE_CFG_WEIGHT = {cfg.toFixed(2)}</code><br />
        <code>SOYNADE_TEMPERATURE = {temp.toFixed(2)}</code>
        <br /><br />
        {/* SOYNADE_SPEED a disparu d'ici : le modèle de voix n'a pas de
            réglage de vitesse, et laisser cette ligne aurait fait poser à
            Lamine une variable qui ne sert à rien. */}
        Le débit ({debit.toFixed(2)}) ne se reporte nulle part : il est déjà
        actif sur ce téléphone. Dis-le-moi quand il est bon, et j'en fais la
        valeur par défaut pour tout le monde.
      </p>
    </main>
  );
}
