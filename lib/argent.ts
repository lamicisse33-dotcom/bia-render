/* ── L'ARGENT, ÉCRIT PAREIL PARTOUT ─────────────────────────────────────────

   Deux lignes, mais elles méritent leur propre fichier : le devis, les
   supports de la boutique et le PDF écrivent tous des montants, et il ne
   faut pas qu'un même total s'écrive « 12 500 FCFA » ici et « 12500 F » là.

   Le franc CFA n'a pas de centimes : tout est arrondi à l'entier. Les
   milliers sont séparés par une espace INSÉCABLE, pour que « 1 250 000 » ne
   se coupe jamais en deux au bout d'une ligne — sur un téléphone étroit,
   c'est arrivé, et un montant coupé se lit de travers. */

export const franc = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/ | | /g, " ")} FCFA`;

/** Le nombre seul, sans la monnaie : pour les quantités, les sacs, les jours. */
export const nombre = (n: number) =>
  Math.round(n).toLocaleString("fr-FR").replace(/ | | /g, " ");
