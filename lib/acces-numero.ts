import { createHmac } from "node:crypto";

/* ── LE NUMÉRO DE TÉLÉPHONE, MIS EN FORME ET RENDU ILLISIBLE ───────────────

   Demandé par Lamine le 28 octobre 2026 : pour entrer dans BIA, il faut
   maintenant un NUMÉRO et un CODE, et le code se lie au numéro à sa première
   utilisation.

   DEUX CHOSES VIVENT ICI, ET RIEN D'AUTRE :

   1. `normaliserNumero` — ramener toutes les façons d'écrire un numéro à une
      seule. « 77 123 45 67 », « 221771234567 », « 00221 77 123 45 67 » et
      « +221771234567 » sont le même téléphone ; sans ça, le même homme serait
      refusé parce qu'il a tapé un espace de plus que la veille.

   2. `empreinteNumero` — ne JAMAIS ranger le numéro lui-même. On range une
      empreinte signée avec le secret du serveur. Elle suffit à répondre à la
      seule question qu'on pose — « est-ce le même téléphone qu'hier ? » — et
      elle ne permet à personne, pas même à nous, de retrouver le numéro.

      Pourquoi signée et pas un simple sha256 : il y a moins de dix millions
      de numéros sénégalais. Un sha256 nu se casse en quelques minutes sur un
      ordinateur portable. Avec le secret de Render dedans, celui qui volerait
      le rangement n'a rien : il lui faudrait AUSSI le secret.

   Aucun appel réseau dans ce fichier, aucune dépendance : il s'éprouve seul,
   et il est le seul endroit où la forme d'un numéro est décidée. */

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

function secret() {
  return process.env.BIA_SECRET || process.env.BIA_CODE_MAITRE || "";
}

/** L'empreinte signée d'un numéro déjà normalisé. Vide si aucun secret. */
export function empreinteNumero(numero: string): string {
  if (!secret()) return "";
  return createHmac("sha256", secret()).update("numero:" + numero).digest("hex").slice(0, 32);
}

/** La même chose pour un code : son nom de rangement ne doit pas être le code. */
export function empreinteCode(code: string): string {
  if (!secret()) return "";
  const propre = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHmac("sha256", secret()).update("code:" + propre).digest("hex").slice(0, 32);
}
