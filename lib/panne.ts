/* Mémoire de la dernière panne du modèle.

   Sans elle, une clé refusée, un crédit épuisé et un modèle inconnu donnaient
   exactement le même silence : BIA se rabattait sur ses phrases de secours et
   rien, nulle part, ne disait pourquoi. On garde donc le motif du dernier
   refus et on l'expose dans /api/etat. Rien de secret n'y passe : le statut
   HTTP et le début du message d'erreur, pas la clé. */

export type Panne = {
  quand: string;
  statut: number | string;
  detail: string;
};

let derniere: Panne | null = null;

export function noterPanne(statut: number | string, detail: string) {
  derniere = {
    quand: new Date().toISOString(),
    statut,
    detail: String(detail || "").slice(0, 300),
  };
}

/** Le modèle a répondu : la panne précédente n'a plus lieu d'être affichée. */
export function oublierPanne() {
  derniere = null;
}

export function dernierePanne(): Panne | null {
  return derniere;
}
