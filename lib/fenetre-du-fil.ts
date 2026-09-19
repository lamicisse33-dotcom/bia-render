/* ── LA FENÊTRE DU FIL SAUTE PAR PALIERS, ELLE NE GLISSE PLUS ───────────────

   Lu en ligne le 19 septembre 2026, trois tours après le déploiement du
   cache du fil :

       fil_en_cache : mis_en_cache 0, trop_long_pour_le_cache 3,
                      messages_moyens 12

   Le cache du fil ne s'était JAMAIS armé. Le fil du téléphone est gardé
   d'une conversation à l'autre : il fait toujours douze messages ou plus, et
   `slice(-12)` avance d'un cran à chaque échange. Le DÉBUT du fil changeait
   donc à chaque tour, et un cache ne retrouve jamais son préfixe. J'avais
   supposé des conversations courtes ; le cas que je croyais rare était le
   seul cas.

   ── DONC LE DÉBUT NE BOUGE QUE TOUS LES HUIT MESSAGES ──────────────────────

   La fenêtre commence à un multiple de huit et va jusqu'au bout. Pendant
   quatre échanges, le préfixe envoyé au modèle est identique : le cache le
   relit au dixième, seul l'échange neuf s'écrit. Au cinquième, le début
   saute de huit et on repaie une écriture — une fois sur quatre au lieu de
   quatre fois sur quatre. La fenêtre fait alors de douze à dix-huit messages
   au lieu de douze pile : un peu plus de texte, mais relu, pas repayé.

   ÇA SE CALCULE SUR LE TÉLÉPHONE, PAS SUR LE SERVEUR. Le serveur ne voit que
   ce qu'on lui envoie ; s'il recevait « les 24 derniers » et découpait
   dedans, le contenu glisserait sous ses indices et le préfixe changerait
   quand même. Le téléphone connaît la vraie longueur du fil : c'est lui qui
   découpe. Le serveur se contente d'un plafond. */

/** Au moins autant de messages dans la fenêtre. */
export const FENETRE_DU_FIL = 12;
/** Le début n'avance que par sauts de cette taille. */
export const PAS_DU_FIL = 8;
/** Ce que le serveur accepte au plus — la fenêtre n'y arrive jamais. */
export const FIL_AU_PLUS = 24;

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
