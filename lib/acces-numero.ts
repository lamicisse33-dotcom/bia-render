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

export { normaliserNumero, MESSAGES_NUMERO } from "./numero-format";

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
