/* Mémoire des pannes du modèle.

   Sans elle, une clé refusée, un crédit épuisé et un modèle inconnu donnaient
   exactement le même silence : BIA se rabattait sur ses phrases de secours et
   rien, nulle part, ne disait pourquoi. On garde donc le motif des refus et on
   les expose dans /api/etat. Rien de secret n'y passe : le statut HTTP et le
   début du message d'erreur, pas la clé.

   ── POURQUOI ON NE GARDE PLUS SEULEMENT LA DERNIÈRE ────────────────────────

   Le 10 septembre 2026, Lamine : « quand tu lui demandes certains services,
   elle dit que son moteur ne répond pas. » Le temps de regarder, /api/etat
   affichait « aucune panne » : une réponse réussie entre-temps avait effacé
   la trace, et il ne restait rien à examiner.

   Une panne qu'on ne peut plus lire ne sert à rien. On garde donc les DIX
   dernières, avec leur heure, et une réponse réussie ne les efface plus —
   elle ferme seulement la panne « en cours », celle qui dit que ça va mal
   MAINTENANT. Les deux réponses sont différentes et il faut les deux :
   `derniere_panne` dit si c'est cassé à cet instant, `pannes` dit ce qui
   s'est passé pendant qu'on ne regardait pas.

   Le compteur, lui, ne s'efface jamais : trois pannes sur cinquante échanges
   et trois sur trois ne racontent pas la même histoire. */

export type Panne = {
  quand: string;
  statut: number | string;
  detail: string;
  /** Quelle route a échoué : chat, document, voix… */
  ou: string;
};

const COMBIEN = 10;

let encours: Panne | null = null;
const histoire: Panne[] = [];
let total = 0;

export function noterPanne(statut: number | string, detail: string, ou = "chat") {
  const panne: Panne = {
    quand: new Date().toISOString(),
    statut,
    detail: String(detail || "").slice(0, 300),
    ou,
  };
  encours = panne;
  total += 1;
  histoire.unshift(panne);
  if (histoire.length > COMBIEN) histoire.length = COMBIEN;
}

/** Le modèle a répondu : ça ne va plus mal MAINTENANT. L'histoire reste. */
export function oublierPanne() {
  encours = null;
}

export function dernierePanne(): Panne | null {
  return encours;
}

/** Les dernières pannes, la plus récente d'abord, même si tout va bien depuis. */
export function pannes(): { total: number; dernieres: Panne[] } {
  return { total, dernieres: histoire };
}
