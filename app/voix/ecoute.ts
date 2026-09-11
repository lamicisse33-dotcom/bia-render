"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ralentir, vitesseChoisie } from "@/lib/ralentir";

/* ── LA MÉCANIQUE D'ÉCOUTE, ÉCRITE UNE SEULE FOIS ───────────────────────────

   Il y a maintenant DEUX pages de correction : les 42 phrases, et les 68
   nombres. Lamine, le 11 septembre 2026 : « présente-le en page de
   correction, comme tu as fait avec les quarante réponses — c'est plus simple
   pour nous. »

   Deux pages, oui. Deux fois le même code, non. Tout ce qui suit — le code
   d'accès, le contexte audio, l'enchaînement des morceaux, le ralentissement,
   le compteur de dépense, les corrections gardées sur l'appareil — vaut pour
   les deux. Recopié, il aurait dérivé : on aurait corrigé un défaut d'un côté
   et pas de l'autre.

   CHAQUE PAGE GARDE SES CORRECTIONS À PART, sous sa propre clé. Sinon vider
   les nombres effacerait les phrases.

   PROVISOIRE, comme les deux pages qu'il sert : ce fichier part avec elles. */

export const DOLLAR_PAR_SIGNE = 0.22 / 1000;

export type Corrections = Record<string, string>;

export function useEcoute(cleCorrections: string) {
  const [code, setCode] = useState("");
  const [corrections, setCorrections] = useState<Corrections>({});
  const [joue, setJoue] = useState("");
  const [etat, setEtat] = useState("");
  const [signes, setSignes] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    try {
      setCode(localStorage.getItem("bia-code") || "");
      const gardees = localStorage.getItem(cleCorrections);
      if (gardees) setCorrections(JSON.parse(gardees) as Corrections);
    } catch {}
  }, [cleCorrections]);

  /* Gardées à chaque frappe. Perdre une heure de travail parce qu'on a fermé
     un onglet serait impardonnable. */
  useEffect(() => {
    try { localStorage.setItem(cleCorrections, JSON.stringify(corrections)); } catch {}
  }, [corrections, cleCorrections]);

  const contexte = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      const C = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new C();
    }
    return ctxRef.current;
  }, []);

  const taire = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    setJoue("");
  }, []);

  /* On demande les morceaux l'un après l'autre et on les enchaîne, comme BIA
     le fait — sinon une phrase longue s'arrêterait au milieu et on croirait
     que c'est le texte qui cloche. */
  const ecouter = useCallback(async (texte: string, quoi: string) => {
    const propre = texte.trim();
    if (!propre) return;
    if (!code) { setEtat("Il faut ton code d'accès, en haut."); return; }

    taire();
    setJoue(quoi);
    setEtat("");
    try {
      const ctx = contexte();
      if (ctx.state === "suspended") await ctx.resume();

      let partie = 0;
      let total = 1;
      let quand = ctx.currentTime + 0.05;
      let envoyes = 0;

      while (partie < total) {
        const r = await fetch("/api/voix", {
          method: "POST",
          headers: { "content-type": "application/json", "x-bia-code": code },
          body: JSON.stringify({ texte: propre, partie, ou: "essai" }),
        });
        if (r.status === 401) { setEtat("Ce code n'est pas valable."); setJoue(""); return; }
        const d = await r.json() as { parties?: number; audio?: string | null; erreur?: string };
        total = Math.max(1, Number(d.parties) || 1);
        if (!d.audio) {
          setEtat(d.erreur ? `La voix a refusé : ${d.erreur}` : "Aucun son n'est revenu.");
          setJoue("");
          return;
        }
        const octets = Uint8Array.from(atob(d.audio), (c) => c.charCodeAt(0)).buffer;
        const brut = await ctx.decodeAudioData(octets.slice(0));
        /* Le même ralentissement que dans la conversation : on doit entendre
           ce que les gens entendront, pas autre chose. */
        const pose = ralentir(ctx, brut, vitesseChoisie());
        const source = ctx.createBufferSource();
        source.buffer = pose;
        source.connect(ctx.destination);
        source.start(quand);
        quand += pose.duration;
        sourceRef.current = source;
        if (partie === total - 1) source.onended = () => setJoue("");
        envoyes += propre.length / total;
        partie++;
      }
      setSignes((n) => n + Math.round(envoyes));
    } catch (e) {
      setEtat(String((e as Error).message));
      setJoue("");
    }
  }, [code, contexte, taire]);

  return { code, setCode, corrections, setCorrections, joue, etat, setEtat, signes, ecouter, taire };
}

/** Ce qu'il m'envoie à la fin : seulement ce qu'il a CHANGÉ, avec la clé, pour
    que je pose les corrections sans risque de me tromper de ligne. */
export function texteDesCorrections(
  titre: string,
  lignes: Array<{ cle: string; avant: string; apres: string }>,
): string {
  const corps = lignes.map((l) => `${l.cle}\n  avant : ${l.avant}\n  après : ${l.apres}`);
  return `${titre} — ${corps.length} ligne(s)\n\n${corps.join("\n\n")}\n`;
}
