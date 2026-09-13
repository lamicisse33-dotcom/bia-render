"use client";

import { useEffect, useState } from "react";
import { DOLLAR_PAR_SIGNE, useParler } from "@/lib/parler";

/* ── LA MÉCANIQUE DES PAGES DE CORRECTION ───────────────────────────────────

   Il y a plusieurs pages de correction : les 42 phrases, les nombres, les 69
   nouvelles, le guidage, les services. Lamine, le 11 septembre 2026 :
   « présente-le en page de correction, comme tu as fait avec les quarante
   réponses — c'est plus simple pour nous. »

   Plusieurs pages, oui. Plusieurs fois le même code, non. Le code d'accès et
   les corrections gardées sur l'appareil valent pour toutes.

   CHAQUE PAGE GARDE SES CORRECTIONS À PART, sous sa propre clé. Sinon vider
   les nombres effacerait les phrases.

   ── CE QUI EST PARTI D'ICI, ET POURQUOI ─────────────────────────────────────

   Tout ce qui fait DIRE un texte à BIA — contexte audio, enchaînement des
   morceaux, ralentissement, compteur de dépense — vit maintenant dans
   lib/parler.ts. Ces pages-ci sont provisoires et partiront ; la page
   d'apprentissage, elle, reste, et elle a besoin de la même mécanique.
   La laisser ici l'aurait emportée avec elles.

   PROVISOIRE, comme les pages qu'il sert : ce fichier part avec elles. */

export { DOLLAR_PAR_SIGNE };

export type Corrections = Record<string, string>;

export function useEcoute(cleCorrections: string) {
  const [code, setCode] = useState("");
  const [corrections, setCorrections] = useState<Corrections>({});
  const { joue, etat, setEtat, signes, ecouter, taire } = useParler(code);

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
