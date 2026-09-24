/* ── LE CARNET DE PRONONCIATION ────────────────────────────────────────────

   Lamine, le 24 septembre 2026 : « parfois il y a des mots en wolof qu'elle
   prononce mal. Même si c'est enregistré, après, on peut le corriger ? »

   Le texte peut être juste et la voix se tromper quand même. Ce carnet dit à
   la VOIX comment dire un mot, sans toucher à ce qui s'affiche. Il vit dans
   data/prononciation.txt (« mot = comment le dire »), lu une fois au
   démarrage — comme data/khalam.md.

   ET C'EST CE QUI RÉPARE LES SONS GARDÉS : il s'applique AVANT le découpage,
   donc le texte envoyé à la voix change, donc l'empreinte du son change
   (lib/voix-gardees.ts). L'ancien son mal prononcé n'est plus jamais servi ;
   le nouveau est fabriqué une fois, puis gardé à son tour. */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type Regle = { motif: RegExp; dit: string; ecrit: string };

function charger(): Regle[] {
  let brut = "";
  try {
    brut = readFileSync(join(process.cwd(), "data", "prononciation.txt"), "utf8");
  } catch {
    return [];
  }
  const regles: Regle[] = [];
  for (const ligne of brut.split(/\r?\n/)) {
    const l = ligne.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i <= 0) continue;
    const ecrit = l.slice(0, i).trim();
    const dit = l.slice(i + 1).trim();
    if (!ecrit || !dit || ecrit === dit) continue;
    const echappe = ecrit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    /* Un mot entier seulement : « waax » ne doit pas toucher « waaxtaan ». */
    regles.push({ ecrit, dit, motif: new RegExp(`(?<![\\p{L}\\p{M}])${echappe}(?![\\p{L}\\p{M}])`, "giu") });
  }
  /* Les plus longs d'abord : une expression passe avant un de ses mots. */
  return regles.sort((a, b) => b.ecrit.length - a.ecrit.length);
}

const REGLES = charger();

/** Le texte tel que la VOIX doit le dire. */
export function prononcer(texte: string): string {
  let t = String(texte || "");
  for (const r of REGLES) t = t.replace(r.motif, r.dit);
  return t;
}

export function resumePrononciation() {
  return { mots: REGLES.length, exemples: REGLES.slice(0, 5).map((r) => `${r.ecrit} → ${r.dit}`) };
}
