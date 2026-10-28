/* ── LA FORME D'UN NUMÉRO DE TÉLÉPHONE, ET RIEN D'AUTRE ────────────────────

   Ce fichier est SANS DÉPENDANCE, et c'est tout son objet : il tourne aussi
   bien sur le serveur que dans le téléphone. L'écran d'entrée de BIA valide
   donc le numéro avec EXACTEMENT la même règle que la route qui le range —
   une règle écrite deux fois est une règle qui divergera un jour.

   `lib/acces-numero.ts` ajoute par-dessus les empreintes signées, qui ont
   besoin du secret du serveur et ne doivent jamais partir dans un téléphone. */

/** Ce que l'écran a le droit de dire. Jamais un motif technique. */
export const MESSAGES_NUMERO = {
  absent: "Saisis ton numéro de téléphone.",
  invalide: "Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.",
  autre: "Ce code est déjà utilisé avec un autre numéro.",
  essais: "Trop d’essais. Attends quelques minutes avant de réessayer.",
} as const;

/* Le Sénégal d'abord, parce que c'est là que vivent ses utilisateurs : neuf
   chiffres qui commencent par 7, c'est un mobile sénégalais, et on n'oblige
   personne à écrire +221 chez lui. Tout le reste doit porter son indicatif,
   parce qu'on ne peut pas deviner un pays. */
const SENEGAL = "+221";

/**
 * Rend le numéro sous une seule forme (`+` suivi de chiffres), ou `null` s'il
 * n'a aucune chance d'être un téléphone. Ne juge pas si le numéro EXISTE —
 * personne ne le vérifie sans SMS, et Lamine n'en veut pas pour l'instant.
 */
export function normaliserNumero(brut: string | null | undefined): string | null {
  const texte = String(brut ?? "").trim();
  if (!texte) return null;
  /* On garde les chiffres, et le `+` seulement s'il ouvre le numéro. Les
     espaces, points, tirets et parenthèses des carnets d'adresses tombent. */
  const plus = texte.startsWith("+");
  let chiffres = texte.replace(/\D/g, "");
  if (!chiffres) return null;
  /* « 00 » est le `+` de ceux qui composent depuis un fixe. */
  if (!plus && chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  else if (!plus && chiffres.length === 9 && chiffres.startsWith("7")) return SENEGAL + chiffres;
  else if (!plus && chiffres.startsWith("221") && chiffres.length === 12) return "+" + chiffres;
  else if (!plus) return null;
  /* L'UIT plafonne un numéro international à quinze chiffres ; en dessous de
     huit, ce n'est pas un téléphone, c'est une faute de frappe. */
  if (chiffres.length < 8 || chiffres.length > 15) return null;
  if (chiffres.startsWith("0")) return null;
  return "+" + chiffres;
}
