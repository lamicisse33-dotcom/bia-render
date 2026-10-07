/** Keep 32–39 recent messages, with a server ceiling of 40.
 * Older exchanges are summarized separately with positions and objections.
 * Move the window in eight-message steps to keep a reusable prefix. */

/** Au moins autant de messages dans la fenêtre. */
export const FENETRE_DU_FIL = 32;
/** Le début n'avance que par sauts de cette taille. */
export const PAS_DU_FIL = 8;
/** Ce que le serveur accepte au plus — la fenêtre n'y arrive jamais. */
export const FIL_AU_PLUS = 40;

/** L'indice du premier message à envoyer, pour un fil de `longueur` messages. */
export function debutDeLaFenetre(longueur: number): number {
  const L = Math.max(0, Math.floor(Number(longueur) || 0));
  if (L <= FENETRE_DU_FIL) return 0;
  return L - FENETRE_DU_FIL - ((L - FENETRE_DU_FIL) % PAS_DU_FIL);
}

/** Le fil à envoyer : du début de la fenêtre jusqu'au bout. */
export function fenetreDuFil<T>(fil: T[]): T[] {
  return fil.slice(debutDeLaFenetre(fil.length));
}
