"use client";

import { useCallback, useRef, useState } from "react";
import { ralentir, vitesseChoisie } from "@/lib/ralentir";

/* ── LUI FAIRE DIRE UN TEXTE, MOT POUR MOT ──────────────────────────────────

   Demander à BIA de prononcer un texte EXACT — sans passer par le modèle, sans
   qu'elle reformule quoi que ce soit — et l'entendre comme les gens
   l'entendront, ralentissement compris.

   ── POURQUOI CE FICHIER EXISTE, ET POURQUOI ICI ─────────────────────────────

   Cette mécanique était écrite dans app/voix/ecoute.ts, au service des pages de
   correction. Or ces pages sont PROVISOIRES — Lamine, le 11 septembre 2026 :
   « le temps que je puisse tester la liste. Après, on le supprime. » La page
   d'apprentissage, elle, ne l'est pas : c'est là qu'il enseignera le wolof à
   BIA pendant des mois.

   Recopier aurait suffi ce soir et coûté plus tard : on aurait corrigé un
   défaut d'un côté et pas de l'autre. Le morceau commun vit donc dans lib/, où
   rien ne l'emportera, et les deux s'en servent.

   CE QU'IL FAUT SAVOIR SI ON LE TOUCHE :

     — les morceaux sont demandés l'un après l'autre et POSÉS À L'AVANCE sur la
       ligne du temps du contexte audio (`quand`), pas joués à la suite : une
       phrase longue s'arrêterait au milieu, et on croirait que c'est le texte
       qui cloche ;
     — le ralentissement est le même que dans la conversation. On doit entendre
       ce que les gens entendront, pas autre chose — sinon on valide un wolof
       qui sonne juste à une vitesse et faux à l'autre ;
     — chaque écoute SE PAIE, environ deux centimes la phrase. Le compteur est
       rendu pour que la page puisse le dire à voix haute : quelqu'un qui
       essaie cent fois sans le savoir trouve sa facture en fin de mois.     */

/** Le prix de la voix, au signe. Oolel Voices : 0,22 $ les mille. */
export const DOLLAR_PAR_SIGNE = 0.22 / 1000;

export type Parleur = {
  /** Ce qui est en train d'être dit, par son étiquette — "" si rien. */
  joue: string;
  /** Ce qui a mal tourné, en clair, ou "". */
  etat: string;
  setEtat: (t: string) => void;
  /** Les signes envoyés à la voix depuis l'ouverture de la page. */
  signes: number;
  /** Dire ce texte. `quoi` est l'étiquette qui revient dans `joue`. */
  ecouter: (texte: string, quoi: string) => Promise<void>;
  taire: () => void;
};

export function useParler(code: string): Parleur {
  const [joue, setJoue] = useState("");
  const [etat, setEtat] = useState("");
  const [signes, setSignes] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

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
        const d = await r.json() as {
          parties?: number; audio?: string | null; erreur?: string; moteur?: string;
        };
        total = Math.max(1, Number(d.parties) || 1);
        if (!d.audio) {
          /* Le serveur SAIT pourquoi il n'a rien : « navigateur » quand aucune
             voix n'est configurée, un motif quand Soynade a refusé. Ne pas les
             lire, c'était afficher « aucun son n'est revenu » — vrai, et
             inutile : les trois causes ne se réparent pas au même endroit. */
          setEtat(
            d.moteur === "navigateur"
              ? "Aucune voix n'est configurée sur le serveur — la clé Soynade manque, ou elle a été refusée. Rien n'a été facturé. Ouvre « L'état de BIA » : le motif exact y est noté."
              : d.erreur
                ? `La voix a refusé : ${d.erreur}`
                : "Le serveur n'a renvoyé aucun morceau pour ce texte."
          );
          setJoue("");
          return;
        }
        const octets = Uint8Array.from(atob(d.audio), (c) => c.charCodeAt(0)).buffer;
        const brut = await ctx.decodeAudioData(octets.slice(0));
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

  return { joue, etat, setEtat, signes, ecouter, taire };
}
