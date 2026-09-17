/* ── COMBIEN DE MOTS L'OREILLE A EU FAUX ────────────────────────────────────

   Sorti de app/api/essai-oreille/route.ts le 18 septembre 2026 au soir, et
   pas pour faire propre : Next.js REFUSE tout export en plus dans un fichier
   de route, et la compilation s'arrête. Une fonction qu'on veut éprouver doit
   donc vivre ailleurs que dans la route qui l'emploie.

   Ce fichier n'a qu'un import, la normalisation, qui elle-même n'en a aucun.

   ── CE QUE CE CALCUL DÉCIDE ───────────────────────────────────────────────

   C'est lui qui écrira « les cent mots corrigés ne servent à rien » ou
   l'inverse, et donc s'il faut payer 20 % de surcoût sur chaque écoute. Un
   verdict tiré d'une arithmétique fausse est pire que pas de verdict : il est
   cru. D'où une épreuve qui vérifie le calcul à la main, cas par cas —
   epreuve-essayer-son-oreille.ts.

   ── POURQUOI UNE DISTANCE, ET PAS UNE INTERSECTION ────────────────────────

   L'ordre compte dans une phrase : « dama sant » et « sant dama » ne disent
   pas la même chose. Une intersection de mots rendrait « zéro faute » sur une
   phrase remise à l'envers, et le verdict serait faux. On mesure donc une
   distance d'édition SUR LES MOTS — un mot faux, un mot manquant et un mot
   inventé comptent chacun pour une faute.

   C'est la mesure que les fournisseurs publient (WER), donc celle qui permet
   de dire si ElevenLabs tient son propre chiffre : il annonce le wolof entre
   25 et 50 % de mots faux. */

import { normaliser } from "./normaliser";

/* ── LA MESURE, ET SES DEUX PRÉCAUTIONS ─────────────────────────────────────

   On compare MOT À MOT après normalisation, et on rend le taux de mots faux —
   la même mesure que les fournisseurs publient (WER). ElevenLabs range le
   wolof dans son palier « moyen », annoncé entre 25 et 50 % de mots faux :
   on pourra donc dire s'il tient sa propre annonce.

   Une distance d'édition sur les mots, pas une simple intersection : l'ordre
   compte dans une phrase, et « dama sant » n'est pas « sant dama ». */
export function motsFaux(attendu: string, entendu: string): { part: number; mots: number } {
  const a = normaliser(attendu).split(" ").filter(Boolean);
  const b = normaliser(entendu).split(" ").filter(Boolean);
  if (!a.length) return { part: 0, mots: 0 };
  /* Levenshtein sur les mots, une seule ligne de tableau à la fois. */
  let ligne = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const suivante = [i];
    for (let j = 1; j <= b.length; j++) {
      suivante[j] = Math.min(
        ligne[j] + 1,
        suivante[j - 1] + 1,
        ligne[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    ligne = suivante;
  }
  return { part: Math.round((ligne[b.length] / a.length) * 100), mots: a.length };
}

